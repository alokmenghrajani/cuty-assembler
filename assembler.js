/*
  A very simple assembler.

 Currently targets 8051, but the actual architecture shouldn't matter.

 The assembler performs the following tasks:
 1. takes assembly (human readable text) as input.
 2. computes the size and offset of each instruction (we start by assuming every jump is long).
 3. convert long jumps into short jumps, recomputing the offsets.
 4. emits the final machine code (bytes).

 Sample input
 .define p3 [0xb0]

 .org 10
 l1: mov 0x00 p3
     mov 0xff, r0  // some comments
     djnz r0, l1

 Expected output:
 mov 0x00, [0xb0]
 mov 0xff, r0
 djnz r0, -6
*/

var Combinator = require('./node_modules/cuty-parser-combinator/parser_combinator.js');
var Parser = {};
exports.Parser = Parser;

Parser.wrap = function(parser, f) {
	return input => {
		var r = parser(input);
		if (!r[0]) {
			return r;
		}
		return [f(r[0]), r[1]];
	};
};

// Terminals
Parser.whitespace = Parser.wrap(Combinator.re(/\s+/), () => true);
Parser.id = Parser.wrap(Combinator.re(/[a-zA-Z0-9]+/), x => ({id: x}));
Parser.literal = Parser.wrap(Combinator.re(/^(0x[0-9a-f]+|[0-9]+)/), x => ({literal: x}));

Parser.arg = function(input) {
	return Combinator.any([
		Parser.literal,
		Parser.id,
		Parser.wrap(Combinator.seq([
			Parser.wrap(Combinator.re(/\[/), () => true),
			Parser.arg,
			Parser.wrap(Combinator.re(/\]/), () => true)
		]), x => ({'deref': x}))
	])(input);
};

Parser.pragma = function(input) {
	var define = Combinator.seq([
		Combinator.re(/[.]define/),
		Parser.whitespace,
		Parser.id,
		Parser.whitespace,
		Parser.arg]);
	var org = Combinator.seq([
		Combinator.re(/[.]org/),
		Parser.whitespace,
		Parser.literal]);
	return Parser.wrap(Combinator.any([
		define,
		org]), r => ({'pragma': r}))(input);
};

Parser.instruction = function() {
	var label = Parser.wrap(Combinator.re(/[a-zA-Z0-9]+:/), x => ({'label': x}));
	var op = Parser.wrap(Parser.id, x => ({'op': x}));
	var args = Parser.wrap(Combinator.repsep(Parser.arg, Combinator.re(/,\s*/)), x => ({'args': x}));
	return Combinator.seq([
		Combinator.opt(label),
		Parser.whitespace,
		op,
		Parser.whitespace,
		args
	]);
};

Parser.program = Combinator.rep(Combinator.any([Parser.pragma, Parser.instruction(), Parser.whitespace]));

var assemble = function(input) {
	// parse the input
	var ast = Parser.program(input);

	return ast;
};
exports.assemble = assemble;
