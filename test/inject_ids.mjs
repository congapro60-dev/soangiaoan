import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Fix ESM __dirname
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(fs.readFileSync('C:/Users/ADMIN/Downloads/smartplan-ai-14200-firebase-adminsdk-fbsvc-1962fb4df6.json', 'utf8'));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  try {
    const snapshot = await db.collection('adaptiveLessons').where('portalEnabled', '==', true).limit(1).get();
    if (snapshot.empty) {
      console.log("KHÔNG TÌM THẤY BÀI HỌC NÀO ĐANG BẬT CỔNG HỌC SINH.");
      process.exit(0);
    }
    const doc = snapshot.docs[0];
    const teacherId = doc.id;
    const lessonId = doc.data().lesson.id;
    
    // Read the test file
    const testFilePath = path.join(__dirname, 'e2e-production-test.mjs');
    let testCode = fs.readFileSync(testFilePath, 'utf8');
    
    // Replace the placeholders with the real IDs
    testCode = testCode.replace(/const TEACHER_ID = '.*?';/, `const TEACHER_ID = '${teacherId}';`);
    testCode = testCode.replace(/const LESSON_ID = '.*?';/, `const LESSON_ID = '${lessonId}';`);
    
    // Write back
    fs.writeFileSync(testFilePath, testCode, 'utf8');
    
    console.log(`Đã tiêm thành công TEACHER_ID (${teacherId}) và LESSON_ID (${lessonId}) vào file e2e-production-test.mjs!`);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
