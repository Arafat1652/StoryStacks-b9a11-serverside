const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;

// middleware
app.use(
    cors({
      origin: [
        "http://localhost:5173","https://b9a11-book-library.web.app","https://b9a11-book-library.firebaseapp.com"
      ],
      credentials: true,
    })
  );
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9jgyd7l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const bookCollection = client.db("bookLibrary").collection('book')
    const categoryCollection = client.db("bookLibrary").collection('category')
    const borrowCollection = client.db("bookLibrary").collection('borrow')

    // books

    app.get('/books', async(req, res) => {
      const cursor = bookCollection.find();
      const result = await cursor.toArray();
      res.send(result)
  })
  
  // find a book by id for details page
  app.get('/books/:id', async(req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id) };
    const result = await bookCollection.findOne(query);
    res.send(result)
  })

  // save a book
  app.post('/books', async(req, res)=>{
    const book = req.body
    // console.log(book);
    const result = await bookCollection.insertOne(book);
    res.send(result)
    })


    // borrows

    // get borrows book by specific user
    app.get("/myBorrows/:email", async (req, res) => {
      // console.log(req.params.email);
      const result = await borrowCollection.find({ user_email: req.params.email }).toArray();
      res.send(result)
    })

    // save data in borrow collection
    app.post('/borrows', async(req, res)=>{
      const borrow = req.body
      // console.log(borrow);
      const result = await borrowCollection.insertOne(borrow);
      // update book quantity
      const updateDoc = {
        $inc: {quantity: -1}
      }
      const quantityQuery = {_id: new ObjectId(borrow.bookId)}
      const updateQuantity =await bookCollection.updateOne(quantityQuery, updateDoc)
      res.send(result)
      })

      // return data by deleting
      app.delete('/return/:id', async(req, res) => {
        const id = req.params.id
        // from url ? bookId
        const bookIdQuery = {bookId: req.query.bookId}
       console.log('id',id, 'bookid', bookIdQuery.bookId);
        const query = { _id: new ObjectId(id)};
        const result = await borrowCollection.deleteOne(query);
        // for update the quantity
        const updateDoc = {
          $inc: {quantity: 1}
        }
        const returnQuery = {_id: new ObjectId(bookIdQuery.bookId)}
        const updateQuantity = await bookCollection.updateOne(returnQuery, updateDoc)
        res.send(result)
    })



    // categories

    app.get('/categories', async(req, res) => {
      const cursor = categoryCollection.find();
      const result = await cursor.toArray();
      res.send(result)
  })

  // find categorywise book
  app.get("/categories/:category", async (req, res) => {
    // console.log(req.params.category);
    const result = await bookCollection.find({ category: req.params.category }).toArray();
    res.send(result)
  })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('book library server is running')
})

app.listen(port, () => {
  console.log(`Book LIBRARY IS RUNNING on port ${port}`)
})