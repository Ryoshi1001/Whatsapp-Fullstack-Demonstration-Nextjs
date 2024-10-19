import express from 'express'
import multer from 'multer'
import { addAudioMessage, addImageMessage, addMessage, getInitialContactsWithMessages, getMessages } from '../controllers/MessageController.js'


const router = express.Router()

//removing multer to fix Vercel deployment can use Cloudinary or AWS in future if hosting on Vercel
// const uploadImage = multer({ dest: 'uploads/images'})
// //upload for audio with multer
// const upload = multer({ dest: "uploads/recordings"})

router.post('/add-message', addMessage)
//getMessages route
router.get('/get-messages/:from/:to', getMessages)

//route for adding image files from messageBar.jsx using photoPickerChange() and adding multer for file handling here next to router plus addImageMessage controller for route
router.post('/add-image-message', uploadImage.single("image"), addImageMessage)

//route for adding audio messages and sending from messageBar
router.post('/add-audio-message', upload.single("audio"), addAudioMessage)

//route for getting contacts with initial messages for List component inside of ChatList component on left section of Main Chat component. 
router.get('/get-initial-contacts/:from', getInitialContactsWithMessages)

export default router;     