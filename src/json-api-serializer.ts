import { JsonApiResource, JsonApiResourceIdentifier, ApiResponse } from './types';

export class JsonApiSerializer {
  /**
   * Deserialize JSON:API response to plain objects with populated relationships
   */
  static deserialize(response: ApiResponse): any {
    if (!response.data) {
      return null;
    }

    const included = response.included || [];
    const includedMap = this.buildIncludedMap(included);

    if (Array.isArray(response.data)) {
      return response.data.map(resource => this.deserializeResource(resource, includedMap));
    }

    return this.deserializeResource(response.data, includedMap);
  }

  /**
   * Serialize plain object to JSON:API format
   */
  static serialize(type: string, data: Record<string, any>, id?: string): JsonApiResource {
    const resource: JsonApiResource = {
      type,
      id: id || data.id,
      attributes: {},
      relationships: {},
    };

    for (const [key, value] of Object.entries(data)) {
      if (key === 'id' || key === 'type') {
        continue;
      }

      if (this.isRelationship(value)) {
        resource.relationships![key] = this.serializeRelationship(value);
      } else {
        resource.attributes![key] = this.transformValue(value);
      }
    }

    if (Object.keys(resource.relationships!).length === 0) {
      delete resource.relationships;
    }

    return resource;
  }

  private static deserializeResource(
    resource: JsonApiResource,
    includedMap: Map<string, JsonApiResource>
  ): any {
    const result: any = {
      id: resource.id,
      type: resource.type,
      ...resource.attributes,
    };

    // Add meta if present
    if (resource.meta) {
      result.meta = resource.meta;
    }

    // Populate relationships
    if (resource.relationships) {
      for (const [key, relationship] of Object.entries(resource.relationships)) {
        if (!relationship.data) {
          result[key] = null;
          continue;
        }

        if (Array.isArray(relationship.data)) {
          result[key] = relationship.data.map(ref => {
            const included = includedMap.get(this.makeKey(ref.type, ref.id));
            return included
              ? this.deserializeResource(included, includedMap)
              : { id: ref.id, type: ref.type };
          });
        } else {
          const ref = relationship.data as JsonApiResourceIdentifier;
          const included = includedMap.get(this.makeKey(ref.type, ref.id));
          result[key] = included
            ? this.deserializeResource(included, includedMap)
            : { id: ref.id, type: ref.type };
        }
      }
    }

    return result;
  }

  private static buildIncludedMap(included: JsonApiResource[]): Map<string, JsonApiResource> {
    const map = new Map<string, JsonApiResource>();
    for (const resource of included) {
      map.set(this.makeKey(resource.type, resource.id), resource);
    }
    return map;
  }

  private static makeKey(type: string, id: string): string {
    return `${type}:${id}`;
  }

  private static isRelationship(value: any): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }

    // Check if it looks like a relationship (has id and type)
    if (value.id && value.type) {
      return true;
    }

    // Check if it's an array of relationships
    if (Array.isArray(value) && value.length > 0 && value[0].id && value[0].type) {
      return true;
    }

    return false;
  }

  private static serializeRelationship(value: any): any {
    if (Array.isArray(value)) {
      return {
        data: value.map(item => ({
          id: item.id,
          type: item.type,
        })),
      };
    }

    return {
      data: value ? { id: value.id, type: value.type } : null,
    };
  }

  private static transformValue(value: any): any {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map(v => this.transformValue(v));
    }

    if (value && typeof value === 'object' && !(value instanceof Date)) {
      const transformed: any = {};
      for (const [k, v] of Object.entries(value)) {
        transformed[k] = this.transformValue(v);
      }
      return transformed;
    }

    return value;
  }

  /**
   * Parse dates in response data
   */
  static parseDates(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.parseDates(item));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && this.isIsoDateString(value)) {
        result[key] = new Date(value);
      } else if (value && typeof value === 'object') {
        result[key] = this.parseDates(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private static isIsoDateString(value: string): boolean {
    // Check for ISO 8601 date format
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(value);
  }
}
