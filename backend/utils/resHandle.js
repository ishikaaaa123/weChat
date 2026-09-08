const response = (res, statusCode,message,data = null) =>{
    if (!res){
        console.error("res obj is null");
        return;
    }

    const resObj = {
        status: statusCode < 400 ? 'success' : 'error',
        message,
        data
    }
    return res.status(statusCode).json(resObj);
}

module.exports = response;
