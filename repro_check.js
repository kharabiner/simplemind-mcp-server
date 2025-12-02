import { listMindMaps, readMindMap } from './dist/file-manager.js';

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

    // Debug: Print XML content
    try {
        const path = await import('path');
        const fs = await import('fs');
        const AdmZip = (await import('adm-zip')).default;

        // We know it's NFC now from listMindMaps
        const filePath = path.join(process.env.HOME, 'Library/Mobile Documents/iCloud~eu~simplemind/Documents', koreanFile);
        // But wait, listMindMaps returned NFC, but the file on disk is NFD.
        // fs/AdmZip should handle it if we pass NFC?
        // Let's try to find the file first.

        const nfdFile = koreanFile.normalize('NFD');
        const nfdPath = path.join(process.env.HOME, 'Library/Mobile Documents/iCloud~eu~simplemind/Documents', nfdFile);

        if (fs.existsSync(nfdPath)) {
            const zip = new AdmZip(nfdPath);
            const xmlEntry = zip.getEntry('document/mindmap.xml');
            if (xmlEntry) {
                const xml = xmlEntry.getData().toString('utf-8');
                console.log('XML Content Preview (first 500 chars):');
                console.log(xml.substring(0, 500));
                console.log('XML Content Preview (root topic part):');
                // Try to find the root topic definition
                const match = xml.match(/<topic[^>]*id="0"[^>]*>/);
                console.log(match ? match[0] : 'Root topic tag not found via regex');
            }
        }
    } catch (e) {
        console.log('Debug XML extraction failed:', e);
    }

    const doc = await readMindMap(koreanFile);
    if (doc) {
        console.log('Successfully read mind map!');
        console.log('Root topic:', doc.mindmaps[0].rootTopic.text);
        console.log('Full structure:', JSON.stringify(doc.mindmaps[0].rootTopic, null, 2));
    } else {
        console.log('Failed to read mind map.');
    }
}

test().catch(console.error);
