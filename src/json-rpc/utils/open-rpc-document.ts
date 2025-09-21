/**
 * OpenRPC Specification v1.3.2 TypeScript Interfaces
 * Based on https://spec.open-rpc.org/
 */
import { JsonRpcRouter } from "../json-rpc-router";
import { z, toJSONSchema } from "zod";

/**
 * Contact information for the exposed API.
 */
export interface ContactObject {
  /** The identifying name of the contact person/organization. */
  name?: string;
  /** The URL pointing to the contact information. MUST be in the format of a URL. */
  url?: string;
  /** The email address of the contact person/organization. MUST be in the format of an email address. */
  email?: string;
  /** Specification extensions */
  [pattern: `x-${string}`]: any;
}

/**
 * License information for the exposed API.
 */
export interface LicenseObject {
  /** REQUIRED. The license name used for the API. */
  name: string;
  /** A URL to the license used for the API. MUST be in the format of a URL. */
  url?: string;
  /** Specification extensions */
  [pattern: `x-${string}`]: any;
}

/**
 * The object provides metadata about the API.
 */
export interface InfoObject {
  /** REQUIRED. The title of the application. */
  title: string;
  /** A verbose description of the application. GitHub Flavored Markdown syntax MAY be used for rich text representation. */
  description?: string;
  /** A URL to the Terms of Service for the API. MUST be in the format of a URL. */
  termsOfService?: string;
  /** The contact information for the exposed API. */
  contact?: ContactObject;
  /** The license information for the exposed API. */
  license?: LicenseObject;
  /** REQUIRED. The version of the OpenRPC document (which is distinct from the OpenRPC Specification version or the API implementation version). */
  version: string;
  /** Specification extensions */
  [pattern: `x-${string}`]: any;
}

/**
 * An object representing a Server Variable for server URL template substitution.
 */
export interface ServerVariableObject {
  /** An enumeration of string values to be used if the substitution options are from a limited set. */
  enum?: string[];
  /** REQUIRED. The default value to use for substitution, which SHALL be sent if an alternate value is not supplied. */
  default: string;
  /** An optional description for the server variable. GitHub Flavored Markdown syntax MAY be used for rich text representation. */
  description?: string;
  /** Specification extensions */
  [pattern: `x-${string}`]: any;
}

/**
 * Runtime expression type for dynamic values
 */
export type RuntimeExpression = string;

/**
 * An object representing a Server.
 */
export interface ServerObject {
  /** REQUIRED. A name to be used as the canonical name for the server. */
  name: string;
  /** REQUIRED. A URL to the target host. This URL supports Server Variables and MAY be relative. */
  url: RuntimeExpression;
  /** A short summary of what the server is. */
  summary?: string;
  /** An optional string describing the host designated by the URL. GitHub Flavored Markdown syntax MAY be used for rich text representation. */
  description?: string;
  /** A map between a variable name and its value. The value is passed into the Runtime Expression to produce a server URL. */
  variables?: Record<string, ServerVariableObject>;
  /** Specification extensions */
  [pattern: `x-${string}`]: any;
}

/**
 * Schema Object following JSON Schema Draft 7 specification.
 * Can be used for defining input and output data types.
 */
export interface SchemaObject {
  // Core schema properties (JSON Schema Draft 7)
  $id?: string;
  $schema?: string;
  $ref?: string;
  $comment?: string;

  // Type definition
  type?:
    | "null"
    | "boolean"
    | "object"
    | "array"
    | "number"
    | "string"
    | "integer";
  enum?: any[];
  const?: any;

  // Numeric constraints
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;

  // String constraints
  maxLength?: number;
  minLength?: number;
  pattern?: string;

  // Array constraints
  items?: SchemaObject | SchemaObject[];
  additionalItems?: SchemaObject;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  contains?: SchemaObject;

  // Object constraints
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  properties?: Record<string, SchemaObject>;
  patternProperties?: Record<string, SchemaObject>;
  additionalProperties?: boolean | SchemaObject;
  dependencies?: Record<string, SchemaObject | string[]>;
  propertyNames?: SchemaObject;

  // Conditional
  if?: SchemaObject;
  then?: SchemaObject;
  else?: SchemaObject;

  // Logical
  allOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  not?: SchemaObject;

  // Meta-data
  title?: string;
  description?: string;
  default?: any;
  readOnly?: boolean;
  writeOnly?: boolean;
  examples?: any[];

  // Specification extensions
  [pattern: `x-${string}`]: any;
}

/**
 * Content Descriptors describe content and are reusable ways of describing either parameters or results.
 */
export interface ContentDescriptorObject {
  /** REQUIRED. Name of the content that is being described. */
  name: string;
  /** A short summary of the content that is being described. */
  summary?: string;
  /** A verbose explanation of the content descriptor behavior. GitHub Flavored Markdown syntax MAY be used for rich text representation. */
  description?: string;
  /** Determines if the content is a required field. Default value is false. */
  required?: boolean;
  /** REQUIRED. Schema that describes the content. */
  schema: SchemaObject | ReferenceObject;
  /** Specifies that the content is deprecated and SHOULD be transitioned out of usage. Default value is false. */
  deprecated?: boolean;
  /** Specification extensions */
  [pattern: `x-${string}`]: any;
}

/**
 * Parameter structure options for JSON-RPC methods
 */
export type ParamStructure = "by-name" | "by-position" | "either";

/**
 * Application defined error code type
 */
export type ApplicationDefinedErrorCode = number;

/**
 * The Example object defines an example that is intended to match the schema of a given Content Descriptor.
 */
export interface ExampleObject {
  /** Canonical name of the example. */
  name?: string;
  /** Short description for the example. */
  summary?: string;
  /** A verbose explanation of the example. GitHub Flavored Markdown syntax MAY be used for rich text representation. */
  description?: string;
  /** Embedded literal example. The value field and externalValue field are mutually exclusive. */
  value?: any;
  /** A URL that points to the literal example. The value field and externalValue field are mutually exclusive. */
  externalValue?: string;
  /** Specification extensions */
  [pattern: `x-${string}`]: any;
}

/**
 * The Example Pairing object consists of a set of example params and result.
 */
export interface ExamplePairingObject {
  /** REQUIRED. Name for the example pairing. */
  name: string;
  /** A verbose explanation of the example pairing. */
  description?: string;
  /** Short description for the example pairing. */
  summary?: string;
  /** REQUIRED. Example parameters. */
  params: (ExampleObject | ReferenceObject)[];
  /** Example result. When undefined, the example pairing represents usage of the method as a notification. */
  result?: ExampleObject | ReferenceObject;
  /** Specification extensions */
  [pattern: `x-${string}`]: any;
}

/**
 * The Link object represents a possible design-time link for a result.
 */
export interface LinkObject {
  /** REQUIRED. Canonical name of the link. */
  name: string;
  /** A description of the link. GitHub Flavored Markdown syntax MAY be used for rich text representation. */
  description?: string;
  /** Short description for the link. */
  summary?: string;
  /** The name of an existing, resolvable OpenRPC method. This field MUST resolve to a unique Method Object. */
  method?: string;
  /** A map representing parameters to pass to a method as specified with method. */
  params?: Record<string, any | RuntimeExpression>;
  /** A server object to be used by the target method. */
  server?: ServerObject;
  /** Specification extensions */
  [pattern: `x-${string}`]: any;
}

/**
 * Defines an application level error.
 */
export interface ErrorObject {
  /** REQUIRED. A Number that indicates the error type that occurred. This MUST be an integer. */
  code: ApplicationDefinedErrorCode;
  /** REQUIRED. A String providing a short description of the error. The message SHOULD be limited to a concise single sentence. */
  message: string;
  /** A Primitive or Structured value that contains additional information about the error. This may be omitted. */
  data?: any;
  /** Specification extensions */
  [pattern: `x-${string}`]: any;
}

/**
 * Holds a set of reusable objects for different aspects of the OpenRPC.
 */
export interface ComponentsObject {
  /** An object to hold reusable Content Descriptor Objects. */
  contentDescriptors?: Record<string, ContentDescriptorObject>;
  /** An object to hold reusable Schema Objects. */
  schemas?: Record<string, SchemaObject>;
  /** An object to hold reusable Example Objects. */
  examples?: Record<string, ExampleObject>;
  /** An object to hold reusable Link Objects. */
  links?: Record<string, LinkObject>;
  /** An object to hold reusable Error Objects. */
  errors?: Record<string, ErrorObject>;
  /** An object to hold reusable Example Pairing Objects. */
  examplePairingObjects?: Record<string, ExamplePairingObject>;
  /** An object to hold reusable Tag Objects. */
  tags?: Record<string, TagObject>;
  /** Specification extensions */
  [pattern: `x-${string}`]: any;
}

/**
 * A simple object to allow referencing other components in the specification, internally and externally.
 */
export interface ReferenceObject {
  /** REQUIRED. The reference string. */
  $ref: string;
}

/**
 * Adds metadata to a single tag that is used by the Method Object.
 */
export interface TagObject {
  /** REQUIRED. The name of the tag. */
  name: string;
  /** A short summary of the tag. */
  summary?: string;
  /** A verbose explanation for the tag. GitHub Flavored Markdown syntax MAY be used for rich text representation. */
  description?: string;
  /** Additional external documentation for this tag. */
  externalDocs?: ExternalDocumentationObject;
  /** Specification extensions */
  [pattern: `x-${string}`]: any;
}

/**
 * Allows referencing an external resource for extended documentation.
 */
export interface ExternalDocumentationObject {
  /** A verbose explanation of the target documentation. GitHub Flavored Markdown syntax MAY be used for rich text representation. */
  description?: string;
  /** REQUIRED. The URL for the target documentation. Value MUST be in the format of a URL. */
  url: string;
  /** Specification extensions */
  [pattern: `x-${string}`]: any;
}

/**
 * Describes the interface for the given method name.
 */
export interface MethodObject {
  /** REQUIRED. The canonical name for the method. The name MUST be unique within the methods array. */
  name: string;
  /** A list of tags for API documentation control. Tags can be used for logical grouping of methods by resources or any other qualifier. */
  tags?: (TagObject | ReferenceObject)[];
  /** A short summary of what the method does. */
  summary?: string;
  /** A verbose explanation of the method behavior. GitHub Flavored Markdown syntax MAY be used for rich text representation. */
  description?: string;
  /** Additional external documentation for this method. */
  externalDocs?: ExternalDocumentationObject;
  /** REQUIRED. A list of parameters that are applicable for this method. */
  params: (ContentDescriptorObject | ReferenceObject)[];
  /** The description of the result returned by the method. If undefined, the method MUST only be used as a notification. */
  result?: ContentDescriptorObject | ReferenceObject;
  /** Declares this method to be deprecated. Consumers SHOULD refrain from usage of the declared method. Default value is false. */
  deprecated?: boolean;
  /** An alternative servers array to service this method. If an alternative servers array is specified at the Root level, it will be overridden by this value. */
  servers?: ServerObject[];
  /** A list of custom application defined errors that MAY be returned. The Errors MUST have unique error codes. */
  errors?: (ErrorObject | ReferenceObject)[];
  /** A list of possible links from this method call. */
  links?: (LinkObject | ReferenceObject)[];
  /** The expected format of the parameters. Defaults to "either". */
  paramStructure?: ParamStructure;
  /** Array of Example Pairing Objects where each example includes a valid params-to-result Content Descriptor pairing. */
  examples?: (ExamplePairingObject | ReferenceObject)[];
  /** Specification extensions */
  [pattern: `x-${string}`]: any;
}

/**
 * This is the root object of the OpenRPC document.
 */
export interface OpenRPCDocument {
  /** REQUIRED. This string MUST be the semantic version number of the OpenRPC Specification version that the OpenRPC document uses. */
  openrpc: `1.3.2`;
  /** REQUIRED. Provides metadata about the API. The metadata MAY be used by tooling as required. */
  info: InfoObject;
  /** An array of Server Objects, which provide connectivity information to a target server. */
  servers?: ServerObject[];
  /** REQUIRED. The available methods for the API. While it is required, the array may be empty. */
  methods: (MethodObject | ReferenceObject)[];
  /** An element to hold various schemas for the specification. */
  components?: ComponentsObject;
  /** Additional external documentation. */
  externalDocs?: ExternalDocumentationObject;
  /** Specification extensions */
  [pattern: `x-${string}`]: any;
}

// Utility types for common patterns

/**
 * Union type for objects that can be either the actual object or a reference
 */
export type Referenceable<T> = T | ReferenceObject;

/**
 * Type guard to check if an object is a ReferenceObject
 */
export function isReferenceObject(obj: any): obj is ReferenceObject {
  return obj && typeof obj === "object" && typeof obj.$ref === "string";
}

/**
 * Type guard to check if an object is a valid OpenRPC document
 */
export function isOpenRPCDocument(obj: any): obj is OpenRPCDocument {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.openrpc === "string" &&
    obj.info &&
    typeof obj.info === "object" &&
    typeof obj.info.title === "string" &&
    typeof obj.info.version === "string" &&
    Array.isArray(obj.methods)
  );
}

export type OpenRPCVersion = `1.0.${number}`;

/**
 * Service discovery method name as defined in the OpenRPC specification
 */
export const SERVICE_DISCOVERY_METHOD = "rpc.discover" as const;

export const fromJsonRpcRouter = (jsonRpcRouter: JsonRpcRouter) => {
  const document: OpenRPCDocument = {
    openrpc: "1.3.2",
    info: {
      title: jsonRpcRouter.options.info?.title ?? "JSON-RPC Service",
      version: jsonRpcRouter.options.info?.version ?? "1.0.0",
      description:
        jsonRpcRouter.options.info?.description ??
        "A JSON-RPC service for various operations",
    },
    methods: [],
  };

  for (const { method, params, result } of JsonRpcRouter.getMethods(
    jsonRpcRouter,
  )) {
    const paramsO: (ContentDescriptorObject | ReferenceObject)[] = [];
    let resulO: undefined | ContentDescriptorObject | ReferenceObject =
      undefined;

    if (params?.def.type === "object") {
      for (const [key, schema] of Object.entries(params.def.shape)) {
        paramsO.push({
          name: key,
          schema: toJSONSchema(schema as any) as SchemaObject,
        });
      }
    }

    if (params?.def.type === "tuple") {
      let n = 0;
      for (const t of params.def.items) {
        paramsO.push({
          name: `item${n++}`,
          schema: toJSONSchema(t as any) as SchemaObject,
        });
      }
    }

    if (result) {
      resulO = {
        name: "result",
        schema: toJSONSchema(result) as SchemaObject,
      };
    }

    document.methods.push({
      name: method,
      params: paramsO,
      result: resulO,
    });
  }

  return document;
};
