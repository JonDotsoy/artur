# Changelog

## [1.11.1](https://github.com/JonDotsoy/artur/compare/artur-v1.11.0...artur-v1.11.1) (2025-09-22)


### Bug Fixes

* **router:** update middleware handling in fetch method ([3e87fdc](https://github.com/JonDotsoy/artur/commit/3e87fdc74effbeb3eb07439e58c1dc6e85b388a9))
* simplify middleware handling in JsonRpcRouter using decorator ([6e91b17](https://github.com/JonDotsoy/artur/commit/6e91b17c6737a626dc23abd13577ab6fe5c377b9))

## [1.11.0](https://github.com/JonDotsoy/artur/compare/artur-v1.10.1...artur-v1.11.0) (2025-09-21)


### Features

* **event-source:** rename EventSource to EventSourceRoute and add HTTP request access ([#66](https://github.com/JonDotsoy/artur/issues/66)) ([6544a54](https://github.com/JonDotsoy/artur/commit/6544a54cbedc6a4647761690a9dd57b8e1dd40b7))
* **event-source:** rename EventSource to EventSourceRoute and update related documentation and tests ([b6cb104](https://github.com/JonDotsoy/artur/commit/b6cb1043563ceee601285008bc5bb8973c950002))
* implement OpenRPC document generation with enhanced validation types 3b0052feb904cf354aaed9e1d16916196a7966d9 ([90d23dd](https://github.com/JonDotsoy/artur/commit/90d23ddd5452cfa1927a45a4c0df36bba2936d2e))
* **json-rpc:** add comprehensive middleware support with router and method-level configuration 8d6693fb250d15eb1bb6fb918e5e496750cacaa4 ([59c712e](https://github.com/JonDotsoy/artur/commit/59c712e980cc3b76605565f532f752e3ad64f92b))

## [1.10.1](https://github.com/JonDotsoy/artur/compare/artur-v1.10.0...artur-v1.10.1) (2025-09-18)


### Bug Fixes

* handle potential error when closing controller in readableFromIncomingMessage ([956457a](https://github.com/JonDotsoy/artur/commit/956457ab79b0db394355450f638a77b6a44f8763))

## [1.10.0](https://github.com/JonDotsoy/artur/compare/artur-v1.9.2...artur-v1.10.0) (2025-09-17)


### Features

* add Zod schema for validating JSON-RPC notification structure ([61ca1ba](https://github.com/JonDotsoy/artur/commit/61ca1ba7c8feca90e5be20d7edcfd80e69180254))
* allow 'id' parameter to be nullable in toJsonRpcResponse method ([a162629](https://github.com/JonDotsoy/artur/commit/a162629bf6cafb3c5242aba1acf3c2b75dc2c8b5))
* enhance JSON-RPC request processing with parameter and result validation ([5fb1c5e](https://github.com/JonDotsoy/artur/commit/5fb1c5e8293147a2bd370d09bf188932bea64b7a))
* enhance route argument parsing with support for hidden options and custom routes ([ec63ee4](https://github.com/JonDotsoy/artur/commit/ec63ee4e9408944d5783c683dcf783cbb0b669be))
* implement requestFromIncomingMessage utility for handling HTTP requests ([845d36c](https://github.com/JonDotsoy/artur/commit/845d36cee7b3228653b3927d57e5e6d4218aaa22))
* improve route parsing with enhanced URL pattern matching and HTTP method validation ([e9b07ec](https://github.com/JonDotsoy/artur/commit/e9b07ec32e0d7a0082a52b425f00d85ebd63631e))
* make 'id' field nullable in JsonRpcErrorResponse interface ([f1131ec](https://github.com/JonDotsoy/artur/commit/f1131ec96ce7adfc9efedeea651689948e77bbf2))
* make 'id' field optional in JSON-RPC request schema ([c1939e9](https://github.com/JonDotsoy/artur/commit/c1939e97ab2c171ba067508efbb4d08a28cb8f56))
* refactor response handling in Session class to enqueue responses or errors ([f66457a](https://github.com/JonDotsoy/artur/commit/f66457aace7013c315b22115f33db00edf112de0))
* simplify request handling by utilizing requestFromIncomingMessage utility ([decb447](https://github.com/JonDotsoy/artur/commit/decb44707721e29706bafdb642212be5206f3583))
* update EventSource to integrate with HTTP router using customRoute ([d3b6f64](https://github.com/JonDotsoy/artur/commit/d3b6f643c786fb7a47dc2b17ed22c7d88b44d248))

## [1.9.2](https://github.com/JonDotsoy/artur/compare/artur-v1.9.1...artur-v1.9.2) (2025-09-12)


### Bug Fixes

* remove CommonJS support and add comprehensive E2E compatibility tests ([#54](https://github.com/JonDotsoy/artur/issues/54)) ([7ab3827](https://github.com/JonDotsoy/artur/commit/7ab38276143866414eb9f75cea6c359a0c81d3c6))

## [1.9.1](https://github.com/JonDotsoy/artur/compare/artur-v1.9.0...artur-v1.9.1) (2025-09-12)


### Bug Fixes

* add static from method to EventsReadableStream for improved stream creation ([fd992ff](https://github.com/JonDotsoy/artur/commit/fd992ffb394960213f8dd6031a40954f330bc345))

## [1.9.0](https://github.com/JonDotsoy/artur/compare/artur-v1.8.3...artur-v1.9.0) (2025-09-12)


### Features

* add exports for sent-event module in package.json ([0bce889](https://github.com/JonDotsoy/artur/commit/0bce8898bcab786ed2b921d01b49411e1fd6c05c))
* enhance EventsReadableStream with iterable and toArray methods; add error handling in EventSource.create ([a0d3c51](https://github.com/JonDotsoy/artur/commit/a0d3c51984b26728408d8676736550da08896a42))
* export EventSource, EventSourceRequest, and EventsReadableStream from event-source module ([2fd142c](https://github.com/JonDotsoy/artur/commit/2fd142c922f561a3b203f18be1e1144d759c04a4))
* implement Server-Sent Events (SSE) module with streaming capabilities and HTTP router integration ([1d6c15c](https://github.com/JonDotsoy/artur/commit/1d6c15c4587d8a514febdf6dea8cef7c884efb54))


### Bug Fixes

* update test function to validate 'accept' header for text/event-stream ([a668bab](https://github.com/JonDotsoy/artur/commit/a668bab5e518425aebc508c57b04442e9d738bcb))

## [1.8.3](https://github.com/JonDotsoy/artur/compare/artur-v1.8.2...artur-v1.8.3) (2025-09-12)


### Features

* add JsonRpcNotification type and update related handlers ([cdb22f4](https://github.com/JonDotsoy/artur/commit/cdb22f4c83c531ecf4ee2a8ae1ed57d227e8e2eb))


### Miscellaneous Chores

* release 1.8.3 ([e289e20](https://github.com/JonDotsoy/artur/commit/e289e201c1b3c411c9ed67d09ba04a26b355b911))

## [1.8.2](https://github.com/JonDotsoy/artur/compare/artur-v1.8.1...artur-v1.8.2) (2025-09-07)


### Bug Fixes

* update import statements to include file extensions for consistency ([684e9da](https://github.com/JonDotsoy/artur/commit/684e9da7366676d2c132fcc42269807f8adbf5fe))

## [1.8.1](https://github.com/JonDotsoy/artur/compare/artur-v1.8.0...artur-v1.8.1) (2025-09-07)


### Miscellaneous Chores

* release 1.8.1 ([50e6135](https://github.com/JonDotsoy/artur/commit/50e613568c559430961e722f5e641fab2d689c93))

## [1.8.0](https://github.com/JonDotsoy/artur/compare/artur-v1.7.1...artur-v1.8.0) (2025-09-05)


### Features

* add input and output validation for JSON-RPC requests in JsonRpcDispatcher ([c785aee](https://github.com/JonDotsoy/artur/commit/c785aeee3b4e81495b832ad2f726bfbd70bff91e))
* add method registration for listing available methods in JsonRpcDispatcher ([e6efde2](https://github.com/JonDotsoy/artur/commit/e6efde23f60909b35d440869cc95d52c4c9955c3))
* add toJsonRpcResponse method to JsonRpcError class for improved error handling ([6950682](https://github.com/JonDotsoy/artur/commit/69506821eb68ef1346ca5467d4fea9d1f084b096))
* add validation types for Zod integration ([78803ed](https://github.com/JonDotsoy/artur/commit/78803edafdf3206858616ee57f2ce7d61cd8ca0b))
* enhance method registration with input and output validation support ([5e73124](https://github.com/JonDotsoy/artur/commit/5e7312419305b871cf483a3bd47627e96749c617))


### Bug Fixes

* improve error handling in JsonRpcDispatcher by simplifying error response structure ([f38c97e](https://github.com/JonDotsoy/artur/commit/f38c97e6e5337c8733e13c5f5150503fefe5369b))
* simplify error handling in JsonRpcDispatcher by using JsonRpcError for internal errors ([99b717c](https://github.com/JonDotsoy/artur/commit/99b717c65c541776967b044ed5e8b89db83aeacf))
* update output validation test to handle invalid output scenario ([913fd92](https://github.com/JonDotsoy/artur/commit/913fd92bf711d2d185bb8d46cb2a82b8d899abe2))

## [1.7.1](https://github.com/JonDotsoy/artur/compare/artur-v1.7.0...artur-v1.7.1) (2025-09-05)


### Bug Fixes

* remove outdated dependency on @jondotsoy/symbol.initialize ([2c44441](https://github.com/JonDotsoy/artur/commit/2c44441a88814da434e205175fbd4fa45dbe55f9))

## [1.7.0](https://github.com/JonDotsoy/artur/compare/artur-v1.6.0...artur-v1.7.0) (2025-09-05)


### Features

* enhance JSON-RPC with session management, SSE streaming, and improved documentation ([#36](https://github.com/JonDotsoy/artur/issues/36)) ([98bce48](https://github.com/JonDotsoy/artur/commit/98bce485fe62b49eae54c6e53023154eadc3cab8))
* enhance JsonRpcHandler to accept event parameter for improved request handling ([c1c7505](https://github.com/JonDotsoy/artur/commit/c1c7505a37e6d0a1b9e823341cacdb2e19283ea1))
* implement session management with SSE support and request handling ([b0237b0](https://github.com/JonDotsoy/artur/commit/b0237b0ebf83989e3c7bcf003a2b30d53ac0f552))


### Bug Fixes

* add error logging for JSON-RPC request processing ([7e5d920](https://github.com/JonDotsoy/artur/commit/7e5d920d530491ef780c87362cdb08606aaab6e7))
* add missing exports for http and json-rpc modules in package.json ([a5e82d0](https://github.com/JonDotsoy/artur/commit/a5e82d0eabbc68e5bed7995928fa012313242b20))
* correct import path for customOptionsSymbol to include file extension ([4d0c4b8](https://github.com/JonDotsoy/artur/commit/4d0c4b8bd5e6aab4b45df2c54e7fbc34faf7ad25))
* import JsonRpcEvent type for improved type safety ([f73e248](https://github.com/JonDotsoy/artur/commit/f73e248587c22df6b3ee969f68d6569c477af205))
* remove direct exports from index.ts and consolidate in http/index.ts ([bed0c01](https://github.com/JonDotsoy/artur/commit/bed0c01645769fc8d286b0b58743d06e67cb299f))
* update fetch method to use JsonRpcEvent for improved request handling ([ab83ed0](https://github.com/JonDotsoy/artur/commit/ab83ed0394061e877ef61701b42d5cb962a30f23))
* update module and moduleResolution to use node16 for compatibility ([773601e](https://github.com/JonDotsoy/artur/commit/773601e4ceef6ac40a3d234fcca618f329716aa7))
* update request method handling to support SSE-enabled PUT requests ([cd34d46](https://github.com/JonDotsoy/artur/commit/cd34d46d471f78e722c50129d4dee024dab647d3))
* update sessionIdFactory to return a Promise for async handling ([949b8ee](https://github.com/JonDotsoy/artur/commit/949b8eebb09e01f3cd1c67ab346b8f0f0416fa42))

## [1.6.0](https://github.com/JonDotsoy/artur/compare/artur-v1.5.1...artur-v1.6.0) (2025-09-01)


### Features

* add registerMethod() and deprecate use() for backward compatibility ([ad1cdd6](https://github.com/JonDotsoy/artur/commit/ad1cdd60b961af1d5b26390bdb6b014b7bd447ea))

## [1.5.1](https://github.com/JonDotsoy/artur/compare/artur-v1.5.0...artur-v1.5.1) (2025-08-25)


### Bug Fixes

* update URLPattern import paths for consistency ([a13346e](https://github.com/JonDotsoy/artur/commit/a13346eed0cddcd4e0886524d3f6930c72747af8))

## [1.5.0](https://github.com/JonDotsoy/artur/compare/artur-v1.4.0...artur-v1.5.0) (2025-08-25)


### Features

* add ArgumentsError and RouterError classes for improved error handling ([dec19ac](https://github.com/JonDotsoy/artur/commit/dec19acd54725cf13659414a90fc40e00e8a7902))
* add types for Middleware, Route, and RouterOptionsDef ([e778edf](https://github.com/JonDotsoy/artur/commit/e778edf3726a06e035ee8ffad9abaea400281529))
* add urlParamsSymbol constant for URL parameter handling ([f048d7f](https://github.com/JonDotsoy/artur/commit/f048d7f4b4656f8b7fcdc3e782865807eb834dca))
* enhance type definitions for Middleware and Route, add TestRoute and URLParams types ([bad9321](https://github.com/JonDotsoy/artur/commit/bad9321a5d8eab93806240eef52357695506df24))
* implement RequestReflect class and enhance argument parsing with validation ([d8de4bb](https://github.com/JonDotsoy/artur/commit/d8de4bb2c80f65659a2a22a82f8634b0c076bf81))
* implement Route class for HTTP routing with test and fetch logic ([79430e1](https://github.com/JonDotsoy/artur/commit/79430e1086b75365332f3eb43827c10579a028f6))

## [1.4.0](https://github.com/JonDotsoy/artur/compare/artur-v1.3.1...artur-v1.4.0) (2025-08-20)


### Features

* implement DataEventSource and DataEventSourceEncoder for event handling ([f573452](https://github.com/JonDotsoy/artur/commit/f573452d7545f0887f5ac79aa025d11cd12f7cab))
* implement Server-Sent Events support with DataEventSourceEncoder ([#22](https://github.com/JonDotsoy/artur/issues/22)) ([1ed2736](https://github.com/JonDotsoy/artur/commit/1ed2736e245494e15466d263b85063d12d32bd8e))
* integrate DataEventSourceEncoder for enhanced event streaming ([021cc07](https://github.com/JonDotsoy/artur/commit/021cc071f88f9db788e89c3404531a015fd820bb))

## [1.3.1](https://github.com/JonDotsoy/artur/compare/artur-v1.3.0...artur-v1.3.1) (2025-08-20)


### Miscellaneous Chores

* release 1.3.1 ([64fcede](https://github.com/JonDotsoy/artur/commit/64fcede014d47a0c580d339fd2367d58f13e2913))

## [1.3.0](https://github.com/JonDotsoy/artur/compare/artur-v1.2.3...artur-v1.3.0) (2025-08-20)


### Features

* add AI Agent guidelines and project documentation ([5f77ed8](https://github.com/JonDotsoy/artur/commit/5f77ed825cc8ec951a912825585b57150da4a5a1))
* add configurable Server-Sent Events support to JsonRpcSessionManager ⚠️ experimental ([#18](https://github.com/JonDotsoy/artur/issues/18)) ([4b5a4b4](https://github.com/JonDotsoy/artur/commit/4b5a4b4efc21bad84b067724cbdf7fe0054d822d))
* add experimental SSE support warning in JsonRpcSessionManager ([6cdbcfa](https://github.com/JonDotsoy/artur/commit/6cdbcfa69b4b991cdc5c8f091138a4cf2baa53f2))
* add options for SSE support in JsonRpcSessionManager ([5dd71b9](https://github.com/JonDotsoy/artur/commit/5dd71b9aadb6837135de3ded6acbddc4c0c2987b))
* add Router custom options symbol and refactor route options structure ([#16](https://github.com/JonDotsoy/artur/issues/16)) ([fda2510](https://github.com/JonDotsoy/artur/commit/fda2510efb4a52db77581a574c3660d43d38f9d3))
* enhance Makefile with proper PHONY targets and separate clean operations ([#15](https://github.com/JonDotsoy/artur/issues/15)) ([94aaa70](https://github.com/JonDotsoy/artur/commit/94aaa70d227e6da2727ed3d81d5fec979343a91e))
* enhance Router options with custom options symbol and refactor options structure ([83c9f45](https://github.com/JonDotsoy/artur/commit/83c9f45d69881cbcc4e89dc889a6002b8ceb16aa))
* implement JsonRpcSessionManager with request handling and error management ([e9a4fca](https://github.com/JonDotsoy/artur/commit/e9a4fca42602892b7d7171e467570a378ae43571))

## [1.2.3](https://github.com/JonDotsoy/artur/compare/artur-v1.2.2...artur-v1.2.3) (2025-01-25)


### Bug Fixes

* **router:** add error handling options and improve fetch return type ([da0bcd6](https://github.com/JonDotsoy/artur/commit/da0bcd6dd888da7a3b26b5ad2e3495ca5f8f05c0))

## [1.2.2](https://github.com/JonDotsoy/artur/compare/artur-v1.2.1...artur-v1.2.2) (2025-01-23)


### Bug Fixes

* **http/router:** improve request handling and add tests ([b3d95ba](https://github.com/JonDotsoy/artur/commit/b3d95ba0bfe20150e21d4e0e263ab94cbe46be61))
* TypeError: Can only call ReadableStreamDefaultController.close on instances of ReadableStreamDefaultController ([#7](https://github.com/JonDotsoy/artur/issues/7)) ([425138b](https://github.com/JonDotsoy/artur/commit/425138bd34c2de60412a5378c4e281bf8ca82576))

## [1.2.1](https://github.com/JonDotsoy/artur/compare/artur-v1.2.0...artur-v1.2.1) (2024-06-04)


### Miscellaneous Chores

* release 1.2.1 ([a34f383](https://github.com/JonDotsoy/artur/commit/a34f383ed539155e1021cb8c78ff694dc84890a0))

## [1.2.0](https://github.com/JonDotsoy/artur/compare/artur-v1.1.0...artur-v1.2.0) (2024-06-04)


### Features

* add support to cors ([d2e08c0](https://github.com/JonDotsoy/artur/commit/d2e08c09ceff4bca64d83ab30fe48464604506bc))
* upgrade declaration to Router.requestListener ([ebf4ec6](https://github.com/JonDotsoy/artur/commit/ebf4ec6b40090cd530de2d2f77ae7258007bda16))

## [1.1.0](https://github.com/JonDotsoy/artur/compare/artur-v1.0.0...artur-v1.1.0) (2024-05-26)


### Features

* add support for `describeErrorResponse` function in `src/index.ts` ([86f77fc](https://github.com/JonDotsoy/artur/commit/86f77fc641704141f784ec79d0c1b763f8c9f330))

## 1.0.0 (2024-05-26)


### Features

* add api to describe errorResponse ([969f513](https://github.com/JonDotsoy/artur/commit/969f513c7ac36a1bc424bf2f9717db516460a380))
* add support to middleware ([f00e5c2](https://github.com/JonDotsoy/artur/commit/f00e5c20f07187a2f0c5459394e9995da12e92c4))
* add support to middleware ([6c8de9a](https://github.com/JonDotsoy/artur/commit/6c8de9af13031d6c671b79223adb1af13cc99d1c))
* add support to module node:http ([c261937](https://github.com/JonDotsoy/artur/commit/c261937d96a394b801e17a7bb59d1c32ad61dfab))
* behavior to error handler ([ef55b3b](https://github.com/JonDotsoy/artur/commit/ef55b3bdd56e4d9fba2191528b066599838b24af))
* initial project ([01fd2cd](https://github.com/JonDotsoy/artur/commit/01fd2cd3649121e7470856430c935b661e3f7c1f))
* upgrade router ([62b7328](https://github.com/JonDotsoy/artur/commit/62b732859cf387bde21c509e16c35908d1b3d412))


### Performance Improvements

* remove sample ([58a5f48](https://github.com/JonDotsoy/artur/commit/58a5f48cedeb446b5e1df30658004ae4f94ba8bf))
