const cloudinary = require("cloudinary").v2;

const uploadToCloudinary = async (fileBuffer) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: "users" }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      })
      .end(fileBuffer);
  });
};

const uploadToCloudinaryPDF = async (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const cloudinaryStream = cloudinary.uploader.upload_stream(
      { resource_type: "raw", folder: "job-applications/cvs" }, // Ensure `resource_type: "raw"`
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    const stream = require("stream");
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);
    bufferStream.pipe(cloudinaryStream);
  });
};

module.exports = { uploadToCloudinary, uploadToCloudinaryPDF };
