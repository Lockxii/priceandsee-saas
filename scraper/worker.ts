import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const prisma = new PrismaClient();
const execAsync = promisify(exec);

async function runWorker() {
  console.log("Starting scrape worker...");
  
  // Find products that haven't been scraped recently, or just all of them for this demo
  const products = await prisma.product.findMany({
    include: { user: true }
  });

  console.log(`Found ${products.length} products to check.`);

  const scriptPath = path.join(__dirname, 'run_scraper.py');

  for (const product of products) {
    console.log(`Scraping ${product.url}...`);
    
    // Create a pending job
    const job = await prisma.scrapingJob.create({
      data: {
        productId: product.id,
        status: 'PENDING'
      }
    });

    try {
      const { stdout, stderr } = await execAsync(`python3 "${scriptPath}" "${product.url}"`);
      const result = JSON.parse(stdout);

      if (result.success) {
        const { title, price, stockStatus } = result.data;

        // Update product
        await prisma.product.update({
          where: { id: product.id },
          data: {
            title,
            currentPrice: price,
            stockStatus
          }
        });

        // Add history if price changed or is new
        if (price !== null && price !== product.currentPrice) {
          await prisma.priceHistory.create({
            data: {
              productId: product.id,
              price
            }
          });
          
          // Here you would trigger an email/Slack alert because price changed
          console.log(`Price change detected for ${product.id}! Old: ${product.currentPrice}, New: ${price}`);
        }

        // Mark job success
        await prisma.scrapingJob.update({
          where: { id: job.id },
          data: { status: 'SUCCESS' }
        });
        
        console.log(`Successfully scraped ${product.url}`);
      } else {
        throw new Error(result.error || "Unknown scraper error");
      }
    } catch (error: any) {
      console.error(`Failed to scrape ${product.url}:`, error.message);
      
      await prisma.scrapingJob.update({
        where: { id: job.id },
        data: { 
          status: 'FAILED',
          errorMessage: error.message.slice(0, 200)
        }
      });
    }
    
    // small delay to prevent rate limits
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log("Scrape worker finished.");
}

runWorker()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
