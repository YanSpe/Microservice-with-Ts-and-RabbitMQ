import express from "express";
import axios from 'axios';
import * as dotenv from 'dotenv';
import { RabbitMQConnection } from "../rabbitmq";

enum Purpose {
    NEW_POLICY_REQUEST = "New Policy Request",
    POLICY_RENEWAL = "Policy Renewal",
    POLICY_MODIFICATION = "Policy Modification",
    QUOTE_REQUEST = "Quote Request",
    INFORMATION_REQUEST = "Information Request",
}

enum Insurance_type {
    TRANSPORT_INSURANCE = "Transport Insurance",
    PRODUCT_LIABILITY_INSURANCE = "Product Liability Insurance",
    ENVIRONMENT_LIABILITY_INSURANCE = "Environmental Liability Insurance",
}

interface Email extends ReadableStream<Uint8Array> {
    from: string;
    subject: string;
    body: string;
}

interface Classified_email_data {
    company_name: string;
    contact_person: string;
    insured_item_activity: string;
    value_of_item: string | null;
    number_of_employees: string | null;
    desired_start_date: string | null;
    origin_and_destination: string | null;
}

interface Classified_email {
    from: string;
    purpose: Purpose;
    insurance_type: Insurance_type;
    data: Classified_email_data;
}

dotenv.config();

const router = express.Router({ mergeParams: true });
const apiKey = process.env.OPENAI_API_KEY;
const apiUrl = 'https://api.openai.com/v1/chat/completions';
const openaiPrompt = process.env.OPENAI_EMAIl_PROMPT;
var bodyParser = require('body-parser');
let jsonParser = bodyParser.json();

const isEmail = (value: any): value is Email => {
    if ((value as Email).from !== undefined && 
        (value as Email).subject !== undefined && 
        (value as Email).body !== undefined
    ) return true;
    else return false;
}

const isClassifiedEmail = (value: any): value is Classified_email => {
    if ((value as Classified_email).from !== undefined && 
        (value as Classified_email).purpose !== undefined && 
        (value as Classified_email).insurance_type !== undefined &&
        (value as Classified_email).data !== undefined
    ) return true;
    else return false;
}


const queryChatGPT = async (prompt: string): Promise<string> => {
  const response = await axios.post(apiUrl, {
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  }, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  return response.data.choices[0].message.content;
};

router.get('/', (req, res) => {
    res.send('only use post to acces e-mail microservice');
});

router.post('/',jsonParser, (req, res) => {
    if (isEmail(req.body)) {
        let email_to_classify: Email = req.body;
        let prompt = (openaiPrompt ?? '') + JSON.stringify(email_to_classify);

        queryChatGPT(prompt).then((message_content: string) => {
            let classified_email = JSON.parse(message_content);
            if (isClassifiedEmail(classified_email)) {
                let send_to_queue: Classified_email = classified_email;

                let rabbitMQConnection = new RabbitMQConnection(send_to_queue.purpose);
                rabbitMQConnection.enqueue(JSON.stringify(send_to_queue))

                res.sendStatus(200);
            } else {
                console.log(JSON.stringify(email_to_classify) + " could not be classified");
                res.sendStatus(500);
            }
        }).catch((error) => {
            console.log(error);
            res.sendStatus(500);
        });
    } else {
        res.sendStatus(400);
    }
});



export default router;