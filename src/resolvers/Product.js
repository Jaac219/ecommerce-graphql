const { product, review, category } = require("../models");

const { generateId, handlePagination } = require("@codecraftkit/utils");
const { default: mongoose } = require("mongoose");

const Products_Get = async(_, {filter = {}, option = {}}) =>{
  try {
    const { skip, limit } = handlePagination(option);

    const query = { isRemove: false };

    const { 
      _id,
      name, 
      quantity,
      price,
      onSale,
      categoryId
    } = filter;
    
    if(_id) query._id = _id;
    if(name) query.name = { $regex: name, $options: 'i' };
    if(quantity) query.quantity = quantity;
    if(price) query.price = price;
    if(onSale) query.onSale = onSale;
    if(categoryId) query.categoryId = categoryId;

    const find = product.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "review",
          localField: "_id",
          foreignField: "productId",
          as: "reviews"
        }
      }
    ]);

    if(limit) find.limit(limit);
    if(skip) find.skip(skip);

    return await find.exec();
  } catch (error) {
    return error;
  }
}

const Product_Save = async(_,  { productInput }) => {
  try {
    return productInput._id 
      ? await Product_Update(_, { productInput }) 
      : await Product_Create(_, { productInput });
  } catch (error) {
    return error;
  }
}

const Product_Create = async(_, { productInput }) => {
  try {
    const _id = generateId();

    const {
      name,
      description,
      quantity,
      image,
      price,
      onSale,
      categoryId 
    } = productInput;

    await new product({ 
      _id, 
      name,
      description,
      quantity,
      image,
      price,
      onSale,
      categoryId 
    }).save();
    
    return _id;
  } catch (error) {
    return error;
  }
}

const Product_Update = async(_, { productInput }) => {
  try {
    const {
      _id,
      name,
      description,
      quantity,
      image,
      price,
      onSale,
      categoryId 
    } = productInput;

    await product.findByIdAndUpdate(_id, 
      {$set: {
        name,
        description,
        quantity,
        image,
        price,
        onSale,
        categoryId 
      }}, { new: true });

    return _id;
  } catch (error) {
    return error;
  }
}

const Product_Delete = async(_, { _id }) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try { 
    await product.findByIdAndUpdate(_id, {$set: { isRemove: true }});
    await review.updateMany({productId: _id}, {$set: { isRemove: true }}); 
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    return error;
  } finally {
    session.endSession();
    return true;
  }
}

const Product_Count = async(_, {filter = {}}) =>{
  try {
    const query = { isRemove: false };

    const { 
      _id,
      name, 
      quantity,
      price,
      onSale,
      categoryId
    } = filter;
    
    if(_id) query._id = _id;
    if(name) query.name = { $regex: name, $options: 'i' };
    if(quantity) query.quantity = quantity;
    if(price) query.price = price;
    if(onSale) query.onSale = onSale;
    if(categoryId) query.categoryId = categoryId;

    return await product.countDocuments(query);

  } catch (error) {
    return error
  }

}

module.exports = {
  Query: {
    Products_Get,
    Product_Count
  },
  Mutation: {
    Product_Save,
    Product_Delete
  }
}