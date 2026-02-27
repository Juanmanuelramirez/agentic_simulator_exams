import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = "ExamSimulator-Simulators";

const CREDENTIALS = {
    accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.VITE_AWS_SECRET_ACCESS_KEY || 'dummy',
};

const dbClient = new DynamoDBClient({
    region: process.env.VITE_AWS_REGION || 'us-east-2',
    credentials: CREDENTIALS
});

const docClient = DynamoDBDocumentClient.from(dbClient, {
    marshallOptions: { removeUndefinedValues: true }
});

async function migrate() {
    console.log("Starting migration for existing exams...");
    try {
        const scan = new ScanCommand({ TableName: TABLE_NAME });
        const { Items } = await docClient.send(scan);

        if (!Items) {
            console.log("No exams found.");
            return;
        }

        console.log(`Found ${Items.length} exams. Checking for missing configuration...`);

        for (const item of Items) {
            if (item.total_questions_official === undefined) {
                console.log(`Updating exam: ${item.name} (${item.id})`);
                const updatedItem = {
                    ...item,
                    total_questions_official: 60 // Default fallback
                };
                await docClient.send(new PutCommand({
                    TableName: TABLE_NAME,
                    Item: updatedItem
                }));
                console.log(`✓ Updated ${item.id}`);
            } else {
                console.log(`- Skipping ${item.id} (already configured)`);
            }
        }
        console.log("Migration completed successfully.");
    } catch (error) {
        console.error("Migration failed:", error);
    }
}

migrate();
