const clientPromise = require('./mdb');

module.exports = async function withDbConnection(req, res, next) {
    try {
        const client = await clientPromise;
        console.log("Connected to MongoDB");

        req.usersCollection = client.db("vbfb").collection("users");
        return next();
    } catch (err) {
        return next(err);
    }
};
