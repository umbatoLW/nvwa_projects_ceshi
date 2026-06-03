import { generateImage } from './src/lib/ai-client.ts';

async function test() {
  console.log('Testing generateImage...');
  try {
    const result = await generateImage('一只超人猫', {
      model: 'wanx2.1-t2i-turbo',
      size: '1024*1024',
      n: 1
    });
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message || error);
  }
}

test();
