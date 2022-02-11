# jlox

This is a lox compiler in javascript.

```lox
for (var a = 1; a < 10; a = a + 1) {
  print a;
}

if (condition) {
  print "yes";
} else {
  print "no";
}

makeBreakfast(bacon, eggs, toast);

fun sayHi(name) {
  print "Hi, " + name;
}

sayHi("John");
```

## Running

`node index` for a REPL.
`node index <file>` to run a file.
