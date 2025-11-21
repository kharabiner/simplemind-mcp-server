const { createMindMap, addTopicToParent, readMindMap } = require('./dist/file-manager.js');

async function verify() {
    try {
        console.log('Creating mind map with horizontal layout...');
        const filename = await createMindMap('Advanced Features Test', 'horizontal');
        console.log(`Created: ${filename}`);

        const doc = await readMindMap(filename);
        const root = doc.mindmaps[0].rootTopic;

        console.log('Adding topic with date...');
        addTopicToParent(root, 'Date Topic', undefined, undefined, undefined, '2023-11-22');

        console.log('Adding topic with checkbox...');
        addTopicToParent(root, 'Checkbox Topic', undefined, undefined, undefined, undefined, true);

        console.log('Adding topic with link...');
        addTopicToParent(root, 'Link Topic', undefined, undefined, undefined, undefined, undefined, 'https://google.com');

        console.log('Adding topic with vertical layout...');
        addTopicToParent(root, 'Vertical Layout Topic', undefined, undefined, 'vertical');

        const { writeMindMap } = require('./dist/file-manager.js');
        await writeMindMap(filename, doc);

        console.log('Reading back mind map...');
        const updatedDoc = await readMindMap(filename);
        const updatedRoot = updatedDoc.mindmaps[0].rootTopic;

        console.log('Root Layout:', updatedRoot.layout);

        updatedRoot.children.forEach(child => {
            console.log(`Topic: ${child.text}`, child);
            if (child.date) console.log(`  Date: ${child.date}`);
            if (child.checkbox) console.log(`  Checkbox: ${child.checkbox}`);
            if (child.link) console.log(`  Link: ${child.link}`);
            if (child.layout) console.log(`  Layout: ${child.layout}`);
        });

    } catch (error) {
        console.error('Verification failed:', error);
    }
}

verify();
