import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';

dotenv.config();
const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const DOMAIN = process.env.CLIENT_URL || 'https://gtcoaching.vercel.app/';


app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const priceMap = {
  bodybuilding: "price_1R5y0qF1ymj85A8b6TJcqZhY",
  powerlifting: "price_1RHaelF1ymj85A8bTrxiIaEG",
  powerbuilding: "price_1RHaf1F1ymj85A8bmwNTIOHp",
};

// Create Checkout Session route
app.post('/create-checkout-session', async (req, res) => {
  const { items } = req.body;

  const line_items = items.map(item => ({
    price: priceMap[item.id],
    quantity: item.quantity
  }));

  try {
    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: 'payment',
      success_url: `${DOMAIN}?success=true`,
      cancel_url: `${DOMAIN}?canceled=true`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Stripe checkout failed' });
  }
});

// Endpoint to handle PDF purchases and email confirmation
app.post('/purchase', async (req, res) => {
  const { email, pdfId, amount } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: 'usd',
      receipt_email: email,
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Purchase Confirmation',
      text: `Thank you for purchasing PDF #${pdfId}. Your payment of $${amount} was successful.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Payment or email error:', error);
    res.status(500).json({ success: false, error: 'Payment failed or email could not be sent.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get('/', (req, res) => {
  res.send('🛠️ GT Coaching Backend is Live!');
});