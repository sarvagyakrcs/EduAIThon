import { PROJECT_NAME } from "@/metadata";

export const onboardingmail = (confirmLink: string) => {
  return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: "Segoe UI", sans-serif;
            background: linear-gradient(135deg, #667eea, #764ba2);
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }
        .container {
            width: 90%;
            max-width: 500px;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0px 10px 30px rgba(0, 0, 0, 0.2);
            text-align: center;
            color: #fff;
        }
        h1 {
            font-size: 24px;
            margin-bottom: 15px;
        }
        p {
            font-size: 16px;
            margin-bottom: 20px;
        }
        .btn {
            display: inline-block;
            padding: 14px 28px;
            font-size: 16px;
            color: #fff;
            background: linear-gradient(45deg, #ff7eb3, #ff758c);
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn:hover {
            transform: translateY(-3px);
            box-shadow: 0px 5px 15px rgba(255, 118, 136, 0.4);
        }
        .footer {
            margin-top: 25px;
            font-size: 14px;
            opacity: 0.8;
        }
    </style>
</head>
<body>

    <div class="container">
        <h1>Welcome to ${PROJECT_NAME} 🎉</h1>
        <p>Thank you for joining us! Click the button below to confirm your email and start your journey.</p>
        <a href="${confirmLink}" class="btn">Confirm Email</a>
        <p>If you did not sign up for ${PROJECT_NAME}, please ignore this email.</p>
        <div class="footer">
            <p>Best regards,</p>
            <p><strong>The ${PROJECT_NAME} Team</strong></p>
        </div>
    </div>

</body>
</html>
`;
};
