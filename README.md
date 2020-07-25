# RandomDB

A NoSQL database that stores the data randomly in the file system.

## Installation

Before installing, make sure to authenticate with GitHub Package Registry or using a `.npmrc` file. See "[Configuring npm for use with GitHub Package Registry](https://help.github.com/en/articles/configuring-npm-for-use-with-github-package-registry#authenticating-to-github-package-registry)".

```
npm config set @alex-sandri:registry https://npm.pkg.github.com/
npm install @alex-sandri/randomdb --save
```

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
