// Script to list all available Google AI models
const apiKey = process.env.GEMINI_API_KEY;


if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env.local');
    process.exit(1);
}

async function listModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', response.status, errorText);
            process.exit(1);
        }

        const data = await response.json();

        console.log('\n📋 AVAILABLE MODELS:\n');
        console.log('='.repeat(80));

        // Separate models by type
        const embeddingModels = [];
        const generativeModels = [];

        data.models.forEach(model => {
            const info = {
                name: model.name,
                displayName: model.displayName,
                supportedMethods: model.supportedGenerationMethods
            };

            if (model.supportedGenerationMethods?.includes('embedContent')) {
                embeddingModels.push(info);
            }
            if (model.supportedGenerationMethods?.includes('generateContent')) {
                generativeModels.push(info);
            }
        });

        console.log('\n🔢 EMBEDDING MODELS (embedContent):');
        console.log('-'.repeat(80));
        embeddingModels.forEach(m => {
            console.log(`  Name: ${m.name}`);
            console.log(`  Display: ${m.displayName}`);
            console.log(`  Methods: ${m.supportedMethods.join(', ')}`);
            console.log('');
        });

        console.log('\n💬 GENERATIVE MODELS (generateContent):');
        console.log('-'.repeat(80));
        generativeModels.forEach(m => {
            console.log(`  Name: ${m.name}`);
            console.log(`  Display: ${m.displayName}`);
            console.log(`  Methods: ${m.supportedMethods.join(', ')}`);
            console.log('');
        });

        console.log('='.repeat(80));
        console.log(`\nTotal models: ${data.models.length}`);
        console.log(`Embedding models: ${embeddingModels.length}`);
        console.log(`Generative models: ${generativeModels.length}\n`);

        // Save to file for easier viewing
        const fs = require('fs');
        const output = {
            totalModels: data.models.length,
            embeddingModels,
            generativeModels,
            allModels: data.models
        };
        fs.writeFileSync('models-list.json', JSON.stringify(output, null, 2));
        console.log('✅ Full model list saved to models-list.json\n');


    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

listModels();
