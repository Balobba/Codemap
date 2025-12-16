# Codemap

Analyze function calls and render a visual codemap svg-file.

Download from https://graphviz.org/download/ and add to PATH.

`ts-morph` will be installed automatically when you run `npm install`.

```sh

npm run codemap

# OR

cd abc/frontend && node codemap.js

cd codemap-output

dot -Tsvg function-calls.dot -o function-calls.svg

```

### Custom graphs

```md
# Better for hierarchical graphs

dot -Tsvg function-calls.dot -o function-calls.svg

# Better for circular layouts

circo -Tsvg function-calls.dot -o function-calls.svg

# Force-directed layout

fdp -Tsvg function-calls.dot -o function-calls.svg

# Network/mesh layout

neato -Tsvg function-calls.dot -o function-calls.svg
```
