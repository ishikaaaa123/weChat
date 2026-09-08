const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const dotenv = require('dotenv');

const fs = require('fs');

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_NAME,
    api_key:process.env.API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})

const uploadFile = (file)=>{
    const options = {
        resource_type: file.mimetype.startsWith('video')?"video":"image"
    }

    return new Promise((resolve,reject)=>{
        const upload = file.mimetype.startsWith('video')? cloudinary.uploader.upload_large : cloudinary.uploader.upload;
        upload(file.path,options, (error,result)=>{
            fs.unlink(file.path,()=>{});
            if (error){
                return reject(error);
            }
            resolve(result);
        })
    })
}

const multermidd = multer({dest:'uploads/'}).single('media');

module.exports = {multermidd, uploadFile};