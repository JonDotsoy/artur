.PHONY: all
all: build

.PHONY: build
build: lib/cjs lib/esm lib/types

.PHONY: clean
clean: clean@lib/types clean@lib/esm clean@lib/cjs

.PHONY: clean@lib/types
clean@lib/types:
	rm -rf ./lib/types

.PHONY: clean@lib/esm
clean@lib/esm:
	rm -rf ./lib/esm

.PHONY: clean@lib/cjs
clean@lib/cjs:
	rm -rf ./lib/cjs

lib/types:
	bunx tsc --project tsconfig.types.json --outDir ./lib/types

lib/esm:
	bunx tsc --project tsconfig.esm.json --outDir ./lib/esm
	echo '{ "type": "module" }' > ./lib/esm/package.json

lib/cjs:
	bunx tsc --project tsconfig.cjs.json --outDir ./lib/cjs
	echo '{ "type": "commonjs" }' > ./lib/cjs/package.json
