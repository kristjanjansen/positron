// Stand-in for norns' engine base class: *new, alloc (in a Routine), addCommand/addPoll, free.
// The context can be a plain Event: Engine_Pappus uses only server, in_b, out_b, xg.
// why: lessons/rig-board-norns.md#crone-header
CroneEngine {
	var <>context, <>doneCallback;
	var <commands, <polls;

	*new { arg context, doneCallback;
		^super.new.init(context, doneCallback);
	}

	init { arg argContext, argDoneCallback;
		context = argContext;
		doneCallback = argDoneCallback;
		commands = IdentityDictionary.new;
		polls = IdentityDictionary.new;
		// alloc runs in a Routine as on norns: Pappus calls server.sync in prAlloc, which needs a
		// thread.
		// why: lessons/rig-board-norns.md#crone-routine
		Routine({
			this.alloc;
			if(doneCallback.notNil, { doneCallback.value(this) });
		}).play(AppClock);
	}

	alloc {}
	free {}

	addCommand { arg name, format, func;
		commands[name.asSymbol] = func;
		^func;
	}

	addPoll { arg name, func, periodic = true;
		polls[name.asSymbol] = func;
		^func;
	}

	// Not norns API: how a caller without Lua runs a command. Handlers expect msg[0] to be the
	// name,
	// so the args are rebuilt into the array norns would send.
	// why: lessons/rig-board-norns.md#crone-cmd
	cmd { arg name ... args;
		var f = commands[name.asSymbol];
		if(f.isNil, {
			("CroneEngine: no command '" ++ name ++ "'").postln;
			^nil;
		});
		^f.value([name.asString] ++ args);
	}

	listCommands {
		^commands.keys.asArray.sort;
	}
}
