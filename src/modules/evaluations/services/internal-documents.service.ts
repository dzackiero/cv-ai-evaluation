import { Injectable, Logger } from '@nestjs/common';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { ConfigService } from '@nestjs/config';
import { QdrantVectorStore } from '@langchain/qdrant';
import { TempFileManager } from '../../../utils/temp-file.util';
import { DocumentType } from 'src/modules/evaluations/types/document-type.enum';

@Injectable()
export class InternalDocumentsService {
  private readonly logger = new Logger(InternalDocumentsService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const qdrantUrl = this.configService.get<string>('QDRANT_URL');
    const qdrantKey = this.configService.get<string>('QDRANT_API_KEY');
    if (!apiKey || !qdrantUrl || !qdrantKey) {
      throw new Error('Missing required configuration for OpenAI or Qdrant');
    }
  }

  async getVectorStore() {
    try {
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured');
      }

      const embeddings = new OpenAIEmbeddings({
        model: 'text-embedding-3-small',
        openAIApiKey: apiKey,
      });

      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
          collectionName: 'internal-documents',
          url: this.configService.get<string>('QDRANT_URL'),
          apiKey: this.configService.get<string>('QDRANT_API_KEY'),
        },
      );

      return vectorStore;
    } catch (error) {
      this.logger.error(
        '[Vector Store] Failed to initialize vector store:',
        error,
      );
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Vector store initialization failed: ${errorMessage}`);
    }
  }

  async storeInternalDocument(
    documentType: DocumentType,
    document: Express.Multer.File,
  ) {
    return await TempFileManager.withTempFile(
      document,
      'internal-doc',
      async (tempFilePath) => {
        this.logger.log(
          `[Document Store] Storing document: ${document.originalname} (Type: ${documentType})`,
        );

        const loader = new PDFLoader(tempFilePath);
        const docs = await loader.load();
        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 800,
          chunkOverlap: 200,
        });
        const splittedDocs = await splitter.splitDocuments(docs);
        const enrichedDocs = splittedDocs.map((doc, idx) => {
          doc.metadata = {
            ...doc.metadata,
            document_type: documentType,
            filename: document.originalname,
            chunk_index: idx,
          };
          return doc;
        });

        const vectorStore = await this.getVectorStore();
        await vectorStore.addDocuments(enrichedDocs);
        this.logger.log(
          `[Document Store] Successfully stored ${enrichedDocs.length} chunks from: ${document.originalname}`,
        );
      },
    );
  }

  async queryInternalDocuments(query: string, filter: string | undefined) {
    try {
      this.logger.log(
        `[Document Query] Searching for: "${query}" (Filter: ${filter || 'none'})`,
      );
      const vectorStore = await this.getVectorStore();
      const results = await vectorStore.similaritySearch(query, 10);
      const filteredResults = results
        .filter((doc) => {
          if (!filter) return true;
          const metadata = doc.metadata as { document_type: string };
          return metadata.document_type === filter;
        })
        .toSorted((a, b) => {
          const metadataA = a.metadata as { chunk_index: number };
          const metadataB = b.metadata as { chunk_index: number };
          return metadataA.chunk_index - metadataB.chunk_index;
        })
        .map((doc) => doc.pageContent)
        .join('\n---\n');

      const model = new ChatOpenAI({
        model: 'gpt-5',
      });

      const result = await model.invoke(`
        You are a knowledge summarizer. Summarize only the information in the following documents that is directly relevant to the query below.
        Do not include unrelated details. Preserve factual accuracy and key terminology.

        Query: "${query}"

        Documents:
        ${filteredResults}

        Focus on documents that match with query and return a concise factual summary:
      `);

      this.logger.log(
        `[Document Query] Successfully retrieved and summarized results`,
      );
      return result.content;
    } catch (error) {
      this.logger.error(
        `[Document Query] Error querying documents for: "${query}"`,
        error,
      );
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to query internal documents: ${errorMessage}`);
    }
  }
}
