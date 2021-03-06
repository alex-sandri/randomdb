# RandomDB

A NoSQL database that stores the data randomly in the file system.

## Disclaimer

RandomDB is just a personal project. It was never intended to be used in any real world application. It is extremely slow.\
RandomDB, given that it stores the data randomly in the file system, might cause some issues or even damage your computer.\
Use this **AT YOUR OWN RISK**.

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
or
```typescript
randomDb.collection("/collection").add({
    field: "value"
});
```
if you want a random id as the document id

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

#### FieldValue properties

##### writeTimestamp

```typescript
randomDb.document("/path/to/a/document").update({
    field: randomDb.FieldValue.writeTimestamp(),
});
```

##### arrayUnion

```typescript
randomDb.document("/path/to/a/document").update({
    field: randomDb.FieldValue.arrayUnion("value"),
});
```

##### arrayRemove

```typescript
randomDb.document("/path/to/a/document").update({
    field: randomDb.FieldValue.arrayRemove("value"),
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
 - `ends-with`
 - `string-contains`
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

## License

This project is licensed under the terms of the MIT license.\
See the [LICENSE](LICENSE) file for details.
