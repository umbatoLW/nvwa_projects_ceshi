import { FetchClient, Config } from 'coze-coding-dev-sdk';

async function main() {
  const config = new Config();
  const client = new FetchClient(config);

  console.log('=== Fetching Vidu.com ===\n');
  const response = await client.fetch('https://www.vidu.com');
  
  console.log('Title:', response.title);
  console.log('URL:', response.url);
  console.log('\n--- Content ---\n');
  
  for (const item of response.content) {
    if (item.type === 'text' && item.text) {
      console.log(item.text);
    } else if (item.type === 'image' && item.image) {
      console.log(`[Image: ${item.image.display_url}]`);
    } else if (item.type === 'link' && item.url) {
      console.log(`[Link: ${item.url}]`);
    }
  }
}

main().catch(console.error);
