const express = require('express')
const cors = require('cors')
require('dotenv').config()
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;


const corsOptions = {
  origin: [
    'http://localhost:5173','https://b9a11-book-library.web.app','https://b9a11-book-library.firebaseapp.com',
  ],
  credentials: true,
  optionSuccessStatus: 200,
}


// app.use(
//     cors({
//       origin: [
//         "http://localhost:5173","https://b9a11-book-library.web.app","https://b9a11-book-library.firebaseapp.com"
//       ],
//       credentials: true,
//     })
//   );

// middleware
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())


// verify jwt middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token
  if (!token) return res.status(401).send({ message: 'unauthorized access' })
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log(err)
        return res.status(401).send({ message: 'unauthorized access' })
      }
      // console.log(decoded)

      req.user = decoded
      next()
    })
  }
}




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


    // jwt
    app.post('/jwt', async (req, res) => {
      const email = req.body
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })

    // clear the token when logout
    app.get('/logout', (req, res) => {
      res
        .clearCookie('token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          maxAge: 0,
        })
        .send({ success: true })
    })


    // books

    app.get('/books',verifyToken, async(req, res) => {
      const token = req.cookies.token
      // console.log(token);
      
      const filter = req.query.filter;
    // console.log(filter);
    // filtering which book quantity is greater then 0
    let query = {};
    if (filter) {
        query = { quantity: { $gt: 0 } };
    }
      const cursor = bookCollection.find(query);
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

  // this is for update page
  app.get('/singleBook/:id', async(req, res)=>{
    const id = req.params.id
    const query = { _id: new ObjectId(id) };
    const result = await bookCollection.findOne(query);
    res.send(result)
  })

  app.put('/updateBook/:id',verifyToken, async(req, res) => {
    const id = req.params.id;
    const book = req.body;
    // console.log(id , book)
    const filter = { _id: new ObjectId(id)};
    const options = { upsert: true };
    const udatedUser = {
      $set: {
        ...book,
      },
    };
    const result = await bookCollection.updateOne(filter, udatedUser, options);
    res.send(result)
  })

  // save a book
  app.post('/books',verifyToken, async(req, res)=>{
    const token = req.cookies.token
      console.log(token);
    const book = req.body
    // console.log(book);
    const result = await bookCollection.insertOne(book);
    res.send(result)
    })


    // borrows

    // get borrows book by specific user
    app.get("/myBorrows/:email",verifyToken, async (req, res) => {
      // console.log(req.params.email);
      const result = await borrowCollection.find({ user_email: req.params.email }).toArray();
      res.send(result)
    })

    // save data in borrow collection
    app.post('/borrows', async(req, res)=>{
      const borrow = req.body
      // console.log(borrow);


      // Check if the user has already borrowed 3 books
    const borrowCount = await borrowCollection.countDocuments({ user_email: borrow.user_email });
    
    if (borrowCount >= 3) {
      return res.status(200).send({message: 'You have already borrowed the maximum number of books (3)' , isError: true});
    }

    // If the user hasn't borrowed 3 books, proceed with borrowing


      // if its already exists then don't execute the next section
      const query = {
        user_email: borrow.user_email,
        bookId: borrow.bookId
      }
      const alreadyExist = await borrowCollection.findOne(query)
      // console.log(alreadyExist);
      
      if(alreadyExist){
        return res.status(200).send({message: 'your are already borrowed this book' , isError: true});
      }
      
      const result = await borrowCollection.insertOne(borrow);
      // update book quantity
      const updateDoc = {
        $inc: {quantity: -1}
      }
      const quantityQuery = {_id: new ObjectId(borrow.bookId)}
      const updateQuantity =await bookCollection.updateOne(quantityQuery, updateDoc)
      return res.status(200).send({message: 'you have succesfully borrwed this book' , isError: false});
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