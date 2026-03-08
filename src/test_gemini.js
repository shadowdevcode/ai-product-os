require('dotenv').config({ path: '.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function checkModels() {
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        await model.generateContent('Hi');
        console.log('gemini-1.5-flash works');
    } catch (e) {
        console.log('gemini-1.5-flash fail:', e.message);
    }

    try {
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-pro' });
        await model.generateContent('Hi');
        console.log('gemini-1.5-pro works');
    } catch (e) {
        console.log('gemini-1.5-pro fail:', e.message);
    }

    try {
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
        await model.generateContent('Hi');
        console.log('gemini-2.0-flash works');
    } catch (e) {
        console.log('gemini-2.0-flash fail:', e.message);
    }

    try {
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
        await model.generateContent('Hi');
        console.log('gemini-1.5-flash-latest works');
    } catch (e) {
        console.log('gemini-1.5-flash-latest fail:', e.message);
    }
}
checkModels();
