import { listMindMaps, readMindMap } from './file-manager.js';

async function test() {
    console.log('Testing listMindMaps...');
    const files = await listMindMaps();
    console.log('Files found:', files);

    const koreanFile = '컴퓨터공학.smmx'; // NFC
    if (files.includes(koreanFile)) {
        console.log(`\nFound ${koreanFile} in list (NFC match).`);
    } else {
        console.log(`\n${koreanFile} NOT found in list.`);
        // Check if it's there in NFD
        const nfd = koreanFile.normalize('NFD');
        if (files.includes(nfd)) {
            console.log(`Found ${koreanFile} in list (NFD match) - Fix NOT working for listMindMaps.`);
        }
    }

    console.log(`\nTesting readMindMap with ${koreanFile}...`);
    const doc = await readMindMap(koreanFile);
    if (doc) {
        console.log('Successfully read mind map!');
        console.log('Root topic:', doc.mindmaps[0].rootTopic.text);
    } else {
        console.log('Failed to read mind map.');
    }
}

test().catch(console.error);
