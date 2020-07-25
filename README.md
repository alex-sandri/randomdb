# RandomDB

A NoSQL database that stores the data randomly in the file system.

## Usage

### Import

```typescript
import * as randomDb from "@alex-sandri/randomdb";
```

### Create a document

```typescript
randomDb.document("/path/to/a/document").set({
    field: "value",
});
```

### Retrieve a document

```typescript
randomDb.document("/path/to/a/document").get();
```

### Update a document

```typescript
randomDb.document("/path/to/a/document").update({
    field: "newValue",
});
```

### Delete a document

```typescript
randomDb.document("/path/to/a/document").delete();
```

### Retrieve multiple documents

```typescript
randomDb.collection("/collection").get();
```

#### Filter the result set

##### Where

Supported conditions:
 - `==`
 - `!=`
 - `>=`
 - `>`
 - `<=`
 - `<`
 - `starts-with`
 - `array-contains`

```typescript
randomDb.collection("/collection").where("field", "starts-with", "prefix").get();
```

##### Limit

```typescript
randomDb.collection("/collection").limit(10).get();
```

##### Offset

```typescript
randomDb.collection("/collection").offset(10).get();
```

##### Sort

```typescript
randomDb.collection("/collection").orderBy("field", "desc").get();
```

### Delete a collection

```typescript
randomDb.collection("/collection").delete();
```
