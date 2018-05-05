class BaseError extends Error {
	
    constructor(message) {

        super(message);
        
        this.name = this.constructor.name;

        if (typeof Error.captureStackTrace === "function") {

            Error.captureStackTrace(this, this.constructor);

        } else { 

            this.stack = (new Error(message)).stack; 
        }
    }
}

class PrompterCancelledError extends BaseError {}

module.exports = {
    PrompterCancelledError
};
