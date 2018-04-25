'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/**
 * Validators for Mongoose.js utilising validator.js
 * @module mongoose-validator
 * @author Lee Powell lee@leepowell.co.uk
 * @copyright MIT
 */

var validatorjs = require('validator');
var is = require('is');
var defaultErrorMessages = require('./default-error-messages.json');
var customValidators = {};
var customErrorMessages = {};

var omit = function omit(obj) {
  for (var _len = arguments.length, keys = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    keys[_key - 1] = arguments[_key];
  }

  return Object.keys(obj).filter(function (key) {
    return !keys.includes(key);
  }).reduce(function (acc, val) {
    acc[val] = obj[val];
    return acc;
  }, {});
};

var getValidatorFn = function getValidatorFn(validator) {
  // Validator has been passed as a function so just return it
  if (is.function(validator)) {
    return validator;
  }
  // Validator has been passed as a string (i.e. 'isLength'), try to find the validator is validator.js or custom validators
  if (is.string(validator) && !is.empty(validator)) {
    return validatorjs[validator] || customValidators[validator] || undefined;
  }
};

var toArray = function toArray() {
  var val = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  return is.array(val) ? val : Array.of(val);
};

var findFirstString = function findFirstString() {
  for (var _len2 = arguments.length, vals = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    vals[_key2] = arguments[_key2];
  }

  return vals.filter(is.string).shift();
};

var interpolateMessageWithArgs = function interpolateMessageWithArgs() {
  var message = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var args = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  return message.replace(/{ARGS\[(\d+)\]}/g, function (match, submatch) {
    return args[submatch] || '';
  });
};

var createValidator = function createValidator(fn, args, passIfEmpty) {
  return function validator(val) {
    var validatorArgs = [val].concat(args);
    if (passIfEmpty && (is.empty(val) || is.nil(val)) || is.undef(val)) {
      return true;
    }
    return fn.apply(this, validatorArgs);
  };
};

/**
 * Create a validator object
 *
 * @alias module:mongoose-validator
 *
 * @param {object} options Options object
 * @param {string} options.validator Validator name to use
 * @param {*} [options.arguments=[]] Arguments to pass to validator. If more than one argument is required an array must be used. Single arguments will internally be coerced into an array
 * @param {boolean} [options.passIfEmpty=false] Weather the validator should pass if the value being validated is empty
 * @param {string} [options.message=Error] Validator error message
 *
 * @return {object} Returns validator compatible with mongoosejs
 *
 * @throws If validator option property is not defined
 * @throws If validator option is not a function or string
 * @throws If validator option is a validator method (string) and method does not exist in validate.js or as a custom validator
 *
 * @example
 * require('mongoose-validator').validate({ validator: 'isLength', arguments: [4, 40], passIfEmpty: true, message: 'Value should be between 4 and 40 characters' )
 */
var validate = function validate(options) {
  if (is.undef(options.validator)) {
    throw new Error('validator option undefined');
  }

  if (!is.function(options.validator) && !is.string(options.validator)) {
    throw new Error('validator must be of type function or string, received ' + _typeof(options.validator));
  }

  var validatorName = is.string(options.validator) ? options.validator : '';
  var validatorFn = getValidatorFn(options.validator);

  if (is.undef(validatorFn)) {
    throw new Error('validator `' + validatorName + '` does not exist in validator.js or as a custom validator');
  }

  var passIfEmpty = !!options.passIfEmpty;
  var mongooseOpts = omit(options, 'passIfEmpty', 'message', 'validator', 'arguments');
  var args = toArray(options.arguments);
  var messageStr = findFirstString(options.message, customErrorMessages[validatorName], defaultErrorMessages[validatorName], 'Error');
  var message = interpolateMessageWithArgs(messageStr, args);
  var validator = createValidator(validatorFn, args, passIfEmpty);

  return Object.assign({
    validator: validator,
    message: message
  }, mongooseOpts);
};

/**
 * Extend the mongoose-validator with a custom validator
 *
 * @param {string} name Validator method name
 * @param {function} fn Validator method function
 * @param {string} [msg=Error] Validator error message
 *
 * @return {undefined}
 *
 * @throws If name is not a string
 * @throws If validator is not a function
 * @throws If message is not a string
 * @throws If name is empty i.e ''
 * @throws If a validator of the same method name already exists
 *
 * @example
 * require('mongoose-validator').extend('isString', function (str) { return typeof str === 'string' }, 'Not a string')
 */
validate.extend = function extend(name, fn) {
  var msg = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'Error';

  if (typeof name !== 'string') {
    throw new Error('name must be a string, received ' + (typeof name === 'undefined' ? 'undefined' : _typeof(name)));
  }

  if (typeof fn !== 'function') {
    throw new Error('validator must be a function, received ' + (typeof fn === 'undefined' ? 'undefined' : _typeof(fn)));
  }

  if (typeof msg !== 'string') {
    throw new Error('message must be a string, received ' + (typeof msg === 'undefined' ? 'undefined' : _typeof(msg)));
  }

  if (name === '') {
    throw new Error('name is required');
  }

  if (customValidators[name]) {
    throw new Error('validator `' + name + '` already exists');
  }

  customValidators[name] = function () {
    for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      args[_key3] = arguments[_key3];
    }

    return fn.apply(this, args);
  };
  customErrorMessages[name] = msg;
};

/**
 * Default error messages
 */
validate.defaultErrorMessages = defaultErrorMessages;

module.exports = validate;