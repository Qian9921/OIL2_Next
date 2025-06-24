import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getUsersByRole, getUser } from '@/lib/firestore';

interface EmailRequest {
  senderEmail: string;
  senderPassword: string;
  subject: string;
  content: string;
  recipientIds: string[]; // 学生ID数组，空数组表示发送给所有学生
}

export async function POST(request: NextRequest) {
  try {
    const { senderEmail, senderPassword, subject, content, recipientIds }: EmailRequest = await request.json();

    // 验证必填字段
    if (!senderEmail || !senderPassword || !subject || !content) {
      return NextResponse.json(
        { error: 'Sender email, password, subject, and content are all required' },
        { status: 400 }
      );
    }

    // 获取收件人邮箱列表
    let recipients: string[] = [];
    
    if (recipientIds.length === 0) {
      // 发送给所有学生
      const allStudents = await getUsersByRole('student');
      recipients = allStudents.map(student => student.email);
    } else {
      // 发送给指定学生
      for (const studentId of recipientIds) {
        const student = await getUser(studentId);
        if (student && student.email) {
          recipients.push(student.email);
        }
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No valid recipient email addresses found' },
        { status: 400 }
      );
    }

    // 配置邮件传输器
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: senderEmail,
        pass: senderPassword, // 建议使用应用专用密码而不是账户密码
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // 验证邮件连接
    try {
      await transporter.verify();
      console.log('SMTP连接验证成功');
    } catch (verifyError) {
      console.error('SMTP连接验证失败:', verifyError);
      return NextResponse.json(
        { error: 'Email server connection failed. Please check your email credentials.' },
        { status: 400 }
      );
    }

    // 发送邮件给每个收件人
    const emailPromises = recipients.map(recipient => 
      transporter.sendMail({
        from: senderEmail,
        to: recipient,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h2 style="color: #2c3e50; margin-bottom: 20px;">Message from Teacher</h2>
              <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db;">
                ${content.replace(/\n/g, '<br>')}
              </div>
              <div style="margin-top: 20px; padding: 15px; background-color: #e8f4f8; border-radius: 8px;">
                <p style="margin: 0; color: #34495e; font-size: 14px;">
                  This email is sent from Open Impact Lab Learning Platform
                </p>
              </div>
            </div>
          </div>
        `,
        text: content, // 纯文本版本
      })
    );

    // 等待所有邮件发送完成
    await Promise.all(emailPromises);

    return NextResponse.json({
      success: true,
      message: `Email successfully sent to ${recipients.length} students`,
      recipientCount: recipients.length,
    });

  } catch (error) {
    console.error('Email sending failed:', error);
    
    let errorMessage = 'Email sending failed. Please check your email settings.';
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.message.includes('Invalid login') || error.message.includes('Username and Password not accepted')) {
        errorMessage = 'Email login failed. Please check your email address and password. Consider using Gmail App Password.';
      } else if (error.message.includes('authentication') || error.message.includes('auth')) {
        errorMessage = 'Email authentication failed. Please use Gmail App Password instead of account password.';
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
        errorMessage = 'Cannot connect to email server. Please check your internet connection.';
      } else {
        // 包含更详细的错误信息以便调试
        errorMessage = `Email sending failed: ${error.message}`;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 