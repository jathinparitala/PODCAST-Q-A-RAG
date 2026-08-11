/**
 * Comprehensive PDF & Unified RAG Automated Test Suite
 */

const fs = require('fs');
const path = require('path');
const { initDatabase } = require('./server/database/init');
const db = require('./server/database/db');
const authService = require('./server/services/authService');
const pdfService = require('./server/services/pdfService');
const embeddingService = require('./server/services/embeddingService');
const retrievalService = require('./server/services/retrievalService');
const generationService = require('./server/services/generationService');
const ragOrchestrationService = require('./server/services/ragOrchestrationService');
const conversationService = require('./server/services/conversationService');

function generateTestPdfBuffer() {
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 7 0 R >> >> >>
endobj
4 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 7 0 R >> >> >>
endobj
5 0 obj
<< /Length 215 >>
stream
BT
/F1 12 Tf
72 720 Td
(Retrieval-Augmented Generation \(RAG\) combines information retrieval with text generation models.) Tj
0 -20 Td
(Page 1 discusses vector embeddings and how document chunks are converted into numerical representations.) Tj
ET
endstream
endobj
6 0 obj
<< /Length 235 >>
stream
BT
/F1 12 Tf
72 720 Td
(Page 2 discusses vector databases and hallucination prevention.) Tj
0 -20 Td
(Vector databases store embeddings for high-speed similarity search during query execution.) Tj
0 -20 Td
(If context lacks information, the assistant responds: I couldn't find enough information.) Tj
ET
endstream
endobj
7 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 8
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000236 00000 n 
0000000357 00000 n 
0000000624 00000 n 
0000000911 00000 n 
trailer
<< /Size 8 /Root 1 0 R >>
startxref
989
%%EOF`;
  return Buffer.from(pdfContent, 'utf-8');
}

async function runPdfTests() {
  console.log('=== Starting PDF RAG Automated Test Suite ===');
  await initDatabase();

  // Get or create test user
  let user = db.get("SELECT * FROM users WHERE email = 'demo@podcastqa.com'");
  if (!user) {
    try {
      const uRes = authService.registerUser({ email: 'demo@podcastqa.com', password: 'Password123!', name: 'Demo User' });
      user = uRes.user;
    } catch (e) {
      user = db.get("SELECT * FROM users LIMIT 1");
    }
  }

  console.log(`✓ Test user resolved: ${user.email} (ID: ${user.id})`);

  // 1. Process PDF Document
  console.log('\n1. Uploading & Ingesting PDF Document...');
  const doc = pdfService.createDocument(user.id, {
    fileName: 'AI_RAG_Research_Guide.pdf',
    fileSize: 1024,
  });

  const pdfBuffer = generateTestPdfBuffer();
  const result = await pdfService.processPdfDocument(doc.id, pdfBuffer, embeddingService);
  console.log(`✓ PDF Processed: ${result.pageCount} pages, ${result.chunkCount} chunks indexed`);

  // Verify DB state
  const storedDoc = pdfService.getDocumentById(doc.id);
  console.log(`✓ Document status in DB: ${storedDoc.status}, pageCount: ${storedDoc.pageCount}`);

  // 2. Start PDF Q&A Conversation
  console.log('\n2. Creating PDF-scoped conversation...');
  const conv = conversationService.createConversation(user.id, {
    documentId: doc.id,
    scope: 'document',
    title: 'PDF RAG Research Test',
  });
  console.log(`✓ Conversation created ID: ${conv.id}`);

  // 3. Test Question 1: PDF Content Query (Page 1)
  console.log('\n3. Question 1: "What does Page 1 say about vector embeddings?"');
  const q1Result = await ragOrchestrationService.processQuestion({
    conversationId: conv.id,
    question: 'What does Page 1 say about vector embeddings?',
    documentId: doc.id,
    sourceType: 'pdf',
    userId: user.id,
  });
  console.log(`\n--- Answer ---\n${q1Result.message.content}`);
  console.log(`--- Citations (${q1Result.citations.length}) ---`);
  q1Result.citations.forEach(c => {
    console.log(`  • Document: ${c.documentName}, Page: ${c.pageNumber} | Snippet: "${c.snippetText}"`);
  });

  // 4. Test Question 2: PDF Page 2 Query
  console.log('\n4. Question 2: "What is discussed on page 2 regarding vector databases?"');
  const q2Result = await ragOrchestrationService.processQuestion({
    conversationId: conv.id,
    question: 'What is discussed on page 2 regarding vector databases?',
    documentId: doc.id,
    sourceType: 'pdf',
    userId: user.id,
  });
  console.log(`\n--- Answer ---\n${q2Result.message.content}`);
  console.log(`--- Citations (${q2Result.citations.length}) ---`);
  q2Result.citations.forEach(c => {
    console.log(`  • Document: ${c.documentName}, Page: ${c.pageNumber} | Snippet: "${c.snippetText}"`);
  });

  // 5. Test Question 3: Grounding / Out-of-Domain Check
  console.log('\n5. Question 3: "What is the capital of Japan?" (Out of domain test)');
  const q3Result = await ragOrchestrationService.processQuestion({
    conversationId: conv.id,
    question: 'What is the capital of Japan?',
    documentId: doc.id,
    sourceType: 'pdf',
    userId: user.id,
  });
  console.log(`\n--- Answer ---\n${q3Result.message.content}`);
  console.log(`--- Citations count: ${q3Result.citations.length} ---`);

  // Assertions
  const pass1 = q1Result.message.content.length > 10 && q1Result.citations.length > 0;
  const pass2 = q2Result.message.content.length > 10 && q2Result.citations.length > 0;
  const pass3 = q3Result.message.content.includes("couldn't find enough information");

  console.log('\n=== TEST SUMMARY ===');
  console.log(`PDF Extraction & Chunking: ${storedDoc.status === 'ready' ? 'PASS' : 'FAIL'}`);
  console.log(`Q1 Page 1 Grounded Answer: ${pass1 ? 'PASS' : 'FAIL'}`);
  console.log(`Q2 Page 2 Citation Test:   ${pass2 ? 'PASS' : 'FAIL'}`);
  console.log(`Q3 Hallucination Fallback:  ${pass3 ? 'PASS' : 'FAIL'}`);

  if (storedDoc.status === 'ready' && pass1 && pass2 && pass3) {
    console.log('\n🎉 ALL PDF & UNIFIED RAG TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('\n❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

runPdfTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
