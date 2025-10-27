import { v2 as cloudinary } from 'cloudinary'
export function configureCloudinary(config) {
  cloudinary.config(config)
}
export { cloudinary }
