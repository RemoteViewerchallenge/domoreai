
import { prisma } from '../src/db.js';

async function main() {
    console.log("--- Verifying Specialized Tables ---");

    const embeddings = await prisma.embeddingModel.findMany({ include: { model: true } });
    console.log(`Embedding Models: ${embeddings.length}`);
    embeddings.forEach(e => console.log(` - ${e.model.name} (Dim: ${e.dimensions})`));

    const audio = await prisma.audioModel.findMany({ include: { model: true } });
    console.log(`Audio Models: ${audio.length}`);
    audio.forEach(a => console.log(` - ${a.model.name}`));

    const images = await prisma.imageModel.findMany({ include: { model: true } });
    console.log(`Image Models: ${images.length}`);
    images.forEach(i => console.log(` - ${i.model.name}`));

    const safety = await prisma.safetyModel.findMany({ include: { model: true } });
    console.log(`Safety Models: ${safety.length}`);
    safety.forEach(s => console.log(` - ${s.model.name}`));

    if (embeddings.length === 0 && audio.length === 0 && images.length === 0) {
        console.error("❌ No specialized models found! Ingestion might not be populating them.");
        process.exit(1);
    } else {
        console.log("✅ Specialized tables verified.");
    }
}

main().catch(console.error);
