const mongoose = require('mongoose');
const Review = require("./review");
const Schema = mongoose.Schema;

const CampgroundSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  image: String,
  price: Number,
  description: String,
  location: String,
  reviews:[
    {
      type: Schema.Types.ObjectId,
      ref: 'Review'
    }
  ]
});


//Middleware to remove reviews associated with the campground upon deletion
CampgroundSchema.post('findOneAndDelete', async function(doc){
  if(doc){
    console.log(doc)
    await Review.deleteMany({
      _id: {
        $in: doc.reviews
      }
    })
  }
})

module.exports = mongoose.model('Campground', CampgroundSchema);
