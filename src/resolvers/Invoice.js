const { invoice, product } = require("../models");

const { generateId, handlePagination } = require("@codecraftkit/utils");

const Invoices_Get = async (_, { filter = {}, option = {} }) => {
  try {
    const { skip, limit } = handlePagination();

    let query = { isRemove: false }

    const {
      _id,
      number,
      createdAt,
      productName,
      productId
    } = filter;

    
    if(_id) query._id = _id;
    if(number) query.number = number;
    if(createdAt) query.createdAt = {
      $gte: new Date(createdAt), 
      $lte: new Date(`${createdAt}T23:59:59.999Z`)
    };
    if(productName) query = {...query, 
      'productsOrder.productName': {
        $regex: productName, 
        $options: 'i'
      }}
    if(productId) query = {...query, 
      'productsOrder.productId': productId}
    
    const find = invoice.find(query);

    if(skip) find.skip(skip);
    if(limit) find.limit(limit);

    return await find.exec();

  } catch (error) {
    return error;
  }
}

const Invoice_Save = async (_, { invoiceInput }) => {
  try {
    return invoiceInput._id 
      ? await Invoice_Update(_, { invoiceInput })
      : await Invoice_Create(_, { invoiceInput });
  } catch (error) {
    return error;
  }
}

const Invoice_Create = async (_, { invoiceInput }) => {
  try {
    const _id = generateId();

    /** variables valor e iva total de la factura */
    let invoicePrice = 0, invoiceIva = 0;

    let {
      number,
      productsOrder
    } = invoiceInput;

    /** Se genera una promesa pending por cada producto actualizar */
    promises = productsOrder.map(async (order) => {
      
      const { productId, cant, iva } = order;
      
      /** Actualización stock de cada producto */  
      const find = await product.findByIdAndUpdate(
        productId, 
        { $inc: { quantity: -cant}
      });

      /** Calculos datos de la factura y ordenes */
      order.productName = find.name;
      order.unitPrice = find.price;
      order.subtotal = cant * find.price;
      order.iva = order.subtotal * (iva/100);
      order.totalValue = order.iva + order.subtotal;

      invoiceIva += order.iva;
      invoicePrice += order.subtotal;

      return order;
    });

    /** Resolución de las promesas */
    await Promise.all(promises);

    await new invoice({ 
      _id,
      number,
      invoicePrice,
      invoiceIva,
      productsOrder,
      totalPrice: invoiceIva+invoicePrice,
    }).save();

    return _id;

  } catch (error) {
    return error;
  }
}

const Invoice_Update = async (_, { invoiceInput }) => {
  try {
    const {
      _id,
      number
    } = invoiceInput;

    await invoice.findByIdAndUpdate(_id, 
    { $set: {
      _id,
      number,
      productsOrder
    }}, { new: true })

  } catch (error) {
    return error;
  }
}

const Invoice_Delete = async (_, { _id }) => {
  try {
    await invoice.findByIdAndUpdate(_id, {$set: {isRemove: true}});
    return true;
  } catch (error) {
    return error;
  }
}

module.exports = {
  Query: {
    Invoices_Get
  },
  Mutation: {
    Invoice_Save,
    Invoice_Delete
  }
}