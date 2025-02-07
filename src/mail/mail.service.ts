import { Injectable } from "@nestjs/common";
import * as nodemailer from 'nodemailer';
import { SentMessageInfo } from 'nodemailer/lib/smtp-transport';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { contextWelcome } from "./dto/templates";

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter<SentMessageInfo>;

    constructor() {
        const email: string = process.env.GOOGLE_EMAIL as string;
        const pass: string = process.env.GOOGLE_PASSWORD as string;

        if (!email || !pass) throw new Error('Email and password must be defined');

        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: email,
                pass,
            }
        });
    }

    async sendWelcomeEmail(to: string, context: contextWelcome) {
        const html = this.loadTemplateWelcome(context);

        return this.sendMail({
            from: process.env.GOOGLE_EMAIL,
            to,
            subject: 'Welcome to Our Platform!',
            html
        });
    }

    private async sendMail(mailOptions: nodemailer.SendMailOptions) {
        try {
            const result = await this.transporter.sendMail(mailOptions);

            // Verificar si el resultado indica un envío exitoso
            if (result && result.messageId) {
                return { success: true, data: result };
            } else {
                return { success: false, error: 'Failed to send email: No message ID found in the result' };
            }
        } catch (error) {
            // Capturar cualquier error durante el envío
            return { success: false, error: error };
        }
    }

    private loadTemplateWelcome(context: contextWelcome): string {
        const templatePath = path.join(__dirname, '..', 'mail', 'templates', 'mail', 'templates', 'welcome.hbs');
        const source = fs.readFileSync(templatePath, 'utf8');
        const template = handlebars.compile(source);
        return template({ body: context });
    }
}