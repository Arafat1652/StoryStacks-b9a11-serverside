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
        "http://localhost:5173",
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

    // books

    app.get('/books', async(req, res) => {
      const cursor = bookCollection.find();
      const result = await cursor.toArray();
      res.send(result)
  })


  app.post('/books', async(req, res)=>{
    const book = req.body
    console.log(book);
    const result = await bookCollection.insertOne(book);
    res.send(result)
    })



    // categories

    app.get('/categories', async(req, res) => {
      const cursor = categoryCollection.find();
      const result = await cursor.toArray();
      res.send(result)
  })

  app.get("/categories/:category", async (req, res) => {
    console.log(req.params.category);
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