PKG_VERSION := $(shell cat package.json | jq -r .version)
PKG_NAME := $(shell cat package.json | jq -r .name)

.PHONY: all
all: build

.PHONY: build
build: lib/cjs lib/esm lib/types

.PHONY: clean
clean: clean@lib/types clean@lib/esm clean@lib/cjs clean@${PKG_NAME}-${PKG_VERSION}.tgz

.PHONY: pack
pack: ${PKG_NAME}-${PKG_VERSION}.tgz

.PHONY: clean@lib/types
clean@lib/types:
	rm -rf ./lib/types

.PHONY: clean@lib/esm
clean@lib/esm:
	rm -rf ./lib/esm

.PHONY: clean@lib/cjs
clean@lib/cjs:
	rm -rf ./lib/cjs

.PHONY: clean@pack
clean@pack: clean@${PKG_NAME}-${PKG_VERSION}.tgz

.PHONY: clean@${PKG_NAME}-${PKG_VERSION}.tgz
clean@${PKG_NAME}-${PKG_VERSION}.tgz:
	rm -f ${PKG_NAME}-${PKG_VERSION}.tgz

lib/types:
	bunx tsc --project tsconfig.types.json --outDir ./lib/types

lib/esm:
	bunx tsc --project tsconfig.esm.json --outDir ./lib/esm
	echo '{ "type": "module" }' > ./lib/esm/package.json

lib/cjs:
	bunx tsc --project tsconfig.cjs.json --outDir ./lib/cjs
	echo '{ "type": "commonjs" }' > ./lib/cjs/package.json

${PKG_NAME}-${PKG_VERSION}.tgz:
	npm pack

info:
	@jq -n -r --arg pkg ${PKG_NAME}-${PKG_VERSION}.tgz '{ $$pkg }'
