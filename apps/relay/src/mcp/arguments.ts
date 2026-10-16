import { isRecord } from "@buzzzz/core";
import { HttpError } from "../security.ts";

export function checkArguments(
  value: unknown,
  schema: Record<string, unknown>,
  path = "arguments",
): void {
  if (schema.enum && Array.isArray(schema.enum) && !schema.enum.includes(value))
    throw new HttpError(400, `${path} has an unsupported value`);
  if (schema.type === "object") {
    if (!isRecord(value)) throw new HttpError(400, `${path} must be an object`);
    const properties = isRecord(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required)
      if (typeof key === "string" && !(key in value))
        throw new HttpError(400, `${path}.${key} is required`);
    for (const [key, item] of Object.entries(value)) {
      const child = Object.hasOwn(properties, key) ? properties[key] : undefined;
      if (isRecord(child)) checkArguments(item, child, `${path}.${key}`);
      else if (schema.additionalProperties === false)
        throw new HttpError(400, `${path}.${key} is not supported`);
    }
  } else if (schema.type === "array") {
    if (
      !Array.isArray(value) ||
      (typeof schema.maxItems === "number" && value.length > schema.maxItems)
    )
      throw new HttpError(400, `${path} is not a bounded array`);
    if (isRecord(schema.items)) for (const item of value) checkArguments(item, schema.items, path);
  } else if (schema.type === "string") {
    if (
      typeof value !== "string" ||
      (typeof schema.minLength === "number" && value.length < schema.minLength) ||
      (typeof schema.maxLength === "number" && value.length > schema.maxLength)
    )
      throw new HttpError(400, `${path} must be a bounded string`);
  } else if (schema.type === "number" || schema.type === "integer") {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      (schema.type === "integer" && !Number.isSafeInteger(value)) ||
      (typeof schema.minimum === "number" && value < schema.minimum) ||
      (typeof schema.maximum === "number" && value > schema.maximum)
    )
      throw new HttpError(400, `${path} must be a valid number`);
  } else if (schema.type === "boolean" && typeof value !== "boolean")
    throw new HttpError(400, `${path} must be boolean`);
}
