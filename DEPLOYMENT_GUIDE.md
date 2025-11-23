# 🚀 EduChoice Vercel Deployment Guide

## ✅ **Your App is Ready for Vercel!**

Your EduChoice capstone project has been converted to work with Vercel serverless functions. Here's how to deploy it:

---

## 📋 **Step 1: Vercel Account Setup**
1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with your GitHub account
3. Click "Import Project" or "New Project"

---

## 🔗 **Step 2: Import Your GitHub Repository**
1. Select "Import Git Repository"
2. Choose your repository: `namancode-verse/educhoice---capstone`
3. Click "Import"

---

## ⚙️ **Step 3: Configure Build Settings**
Vercel will auto-detect your project. Configure these settings:

### **Framework Preset:** Other
### **Build Command:** `cd client/frontend && npm run build`
### **Output Directory:** `client/frontend/dist`
### **Install Command:** `npm install`

---

## 🔐 **Step 4: Environment Variables**
In Vercel dashboard, add these environment variables:

### **Required Variables:**
```
MONGO_URI=your_mongodb_atlas_connection_string
GEMINI_API_KEY=your_google_gemini_api_key
NODE_ENV=production
```

### **How to get these:**

#### **MongoDB Atlas (Free):**
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create free account
3. Create cluster (M0 Sandbox - FREE)
4. Create database user
5. Get connection string
6. Replace `<password>` with your password
7. Example: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/campusElectives`

#### **Google Gemini API Key:**
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Create API key
3. Copy the key

---

## 🚀 **Step 5: Deploy**
1. Click "Deploy" in Vercel
2. Wait 2-3 minutes for deployment
3. Your app will be live at: `https://your-project-name.vercel.app`

---

## ✅ **What Works in Production:**
- ✅ **Student/Teacher Login & Registration**
- ✅ **Dashboard & Project Management**
- ✅ **Certificate Upload System (Open Elective 3)**
- ✅ **Teacher Password Updates**
- ✅ **Gemini AI Chatbot**
- ✅ **Database Operations**
- ✅ **Dark Theme UI**

---

## 🔧 **Troubleshooting:**

### **If deployment fails:**
1. Check build logs in Vercel dashboard
2. Ensure environment variables are set
3. Verify MongoDB connection string

### **If APIs don't work:**
1. Check Function Logs in Vercel dashboard
2. Verify environment variables
3. Test MongoDB connection

### **If frontend doesn't load:**
1. Check build logs
2. Verify build command and output directory

---

## 📱 **Testing Your Deployment:**
1. Visit your Vercel URL
2. Test login with existing users
3. Test certificate upload
4. Test chatbot functionality
5. Test teacher dashboard

---

## 🎉 **You're Ready to Deploy!**

Your EduChoice application is now fully configured for Vercel serverless deployment. The entire application will run on Vercel's free tier with:

- **Frontend**: Served from global CDN
- **Backend**: Serverless functions
- **Database**: MongoDB Atlas (free tier)
- **AI**: Google Gemini API

**Total Cost: FREE** 💸

---

## 📞 **Need Help?**
If you encounter any issues during deployment, the problem is usually:
1. Missing environment variables
2. Incorrect MongoDB connection string
3. Invalid Gemini API key

Good luck with your deployment! 🚀