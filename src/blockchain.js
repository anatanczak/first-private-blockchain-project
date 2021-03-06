/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message`
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

class Blockchain {
  /**
   * Constructor of the class, you will need to setup your chain array and the height
   * of your chain (the length of your chain array).
   * Also everytime you create a Blockchain class you will need to initialize the chain creating
   * the Genesis Block.
   * The methods in this class will always return a Promise to allow client applications or
   * other backends to call asynchronous functions.
   */
  constructor() {
    this.chain = [];
    this.height = -1;
    this.initializeChain();
  }

  /**
   * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
   * You should use the `addBlock(block)` to create the Genesis Block
   * Passing as a data `{data: 'Genesis Block'}`
   */
  async initializeChain() {
    if (this.height === -1) {
      let block = new BlockClass.Block({ data: 'Genesis Block' });
      await this._addBlock(block);
    }
  }

  /**
   * Utility method that return a Promise that will resolve with the height of the chain
   */
  getChainHeight() {
    return new Promise((resolve, reject) => {
      resolve(this.height);
    });
  }

  /**
   * _addBlock(block) will store a block in the chain
   * @param {*} block
   * The method will return a Promise that will resolve with the block added
   * or reject if an error happen during the execution.
   * You will need to check for the height to assign the `previousBlockHash`,
   * assign the `timestamp` and the correct `height`...At the end you need to
   * create the `block hash` and push the block into the chain array. Don't forget
   * to update the `this.height`
   * Note: the symbol `_` in the method name indicates in the javascript convention
   * that this method is a private method.
   */
  _addBlock(block) {
    let self = this;

    return new Promise(async (resolve, reject) => {
      if (self.chain.length === 0) {
        block.time = new Date().getTime().toString().slice(0, -3);
        block.height = 0;
        let hash = SHA256(JSON.stringify(block)).toString();
        block.hash = hash;
        this.height = 0;
        this.chain.push(block);
        return resolve(self);
      } else {
        block.time = new Date().getTime().toString().slice(0, -3);
        let previousBlock = self.chain.find(
          (block) => block.height === self.height
        );
        if (!previousBlock || !previousBlock.hash) {
          console.log('no previous block');
        } else {
          block.previousBlockHash = previousBlock.hash;
        }
        block.height = self.height + 1;
        let hash = SHA256(JSON.stringify(block)).toString();
        block.hash = hash;
        this.chain.push(block);
        self.height += 1;
        resolve(block);
      }
    });
  }

  /**
   * The requestMessageOwnershipVerification(address) method
   * will allow you  to request a message that you will use to
   * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
   * This is the first step before submit your Block.
   * The method return a Promise that will resolve with the message to be signed
   * Return this message: <WALLET_ADRESS>:${new Date().getTime().toString().slice(0,-3)}:starRegistry
   * You will need to replace <WALLET_ADDRESS> with the wallet address submitted
   * by the requestor and the time in your message will allow you to validate the 5 minutes time window.
   * @param {*} address
   */
  requestMessageOwnershipVerification(address) {
    return new Promise((resolve) => {
      const message = `${address}:${new Date()
        .getTime()
        .toString()
        .slice(0, -3)}:starRegistry`;
      return resolve(message);
    });
  }

  /**
   * The submitStar(address, message, signature, star) method
   * will allow users to register a new Block with the star object
   * into the chain. This method will resolve with the Block added or
   * reject with an error.
   * Algorithm steps:
   * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
   * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
   * 3. Check if the time elapsed is less than 5 minutes
   * 4. Verify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
   * 5. Create the block and add it to the chain
   * 6. Resolve with the block added.
   * @param {*} address
   * @param {*} message
   * @param {*} signature
   * @param {*} star
   */
  submitStar(address, message, signature, star) {
    let self = this;
    return new Promise(async (resolve, reject) => {
      const messageComponents = message.split(':');
      if (messageComponents.length === 3) {
        const messageTime = parseInt(message.split(':')[1]);
        let currentTime = parseInt(
          new Date().getTime().toString().slice(0, -3)
        );
        if (messageTime && currentTime - messageTime < 300) {
          if (!bitcoinMessage.verify(message, address, signature)) {
            return reject('Bitcoin message unverified.');
          } else {
            let blockData = {
              address: address,
              message: message,
              signature: signature,
              star: star
            };
            let block = new BlockClass.Block({ data: blockData });
            let createdBlock = await this._addBlock(block);
            return resolve(createdBlock);
          }
        } else {
          return reject('Incorrect time');
        }
      } else {
        return reject('Incorrect message format');
      }
    });
  }

  /**
   * This method will return a Promise that will resolve with the Block
   *  with the hash passed as a parameter.
   * Search on the chain array for the block that has the hash.
   * @param {*} hash
   */
  getBlockByHash(hash) {
    let self = this;
    return new Promise((resolve, reject) => {
      if (self.chain.length > 0) {
        const foundBlock = self.chain.find((block) => block.hash === hash);
        resolve(foundBlock);
      }
    });
  }

  /**
   * This method will return a Promise that will resolve with the Block object
   * with the height equal to the parameter `height`
   * @param {*} height
   */
  getBlockByHeight(height) {
    let self = this;
    return new Promise((resolve, reject) => {
      let block = self.chain.find((chainBlock) => chainBlock.height === height);
      if (block) {
        resolve(block);
      } else {
        reject('Block Not Found!');
      }
    });
  }

  /**
   * This method will return a Promise that will resolve with an array of Stars objects existing in the chain
   * and are belongs to the owner with the wallet address passed as parameter.
   * Remember the star should be returned decoded.
   * @param {*} address
   */
  getStarsByWalletAddress(address) {
    let self = this;
    let stars = [];
    return new Promise((resolve, reject) => {
      self.chain.map((block) => {
        block.getBData().then((data) => {
          if (data && data.address === address) {
            stars.push({
              owner: data.address,
              star: data.star
            });
          }
        });
      });

      resolve(stars);
    });
  }

  /**
   * This method will return a Promise that will resolve with the list of errors when validating the chain.
   * Steps to validate:
   * 1. You should validate each block using `validateBlock`
   * 2. Each Block should check the with the previousBlockHash
   */
  validateChain() {
    let self = this;
    let errorLog = [];
    return new Promise(async (resolve, reject) => {
      let previousBlockHash = '';
      for (const block of self.chain) {
        const blockIsValid = await block.validate();
        if (!blockIsValid) {
          errorLog.push({
            error: 'Block data was tempered',
            invalidBlock: block
          });
        } else {
          previousBlockHash = block.previousBlockHash;
          if (
            block.height > 0 &&
            block.previousBlockHash !== previousBlockHash
          ) {
            errorLog.push({
              error:
                "Previous block hash doesn't match the hash of the previous block",
              hashOnPreviousBlock: previousBlockHash,
              invalidBlock: block
            });
          }
        }
      }
      if (errorLog.length > 0) {
        reject(errorLog);
      }
      resolve('Chain is valid');
    });
  }
}

module.exports.Blockchain = Blockchain;
