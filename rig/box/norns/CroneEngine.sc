// CroneEngine.sc — a stand-in for norns' engine base class.
//
// A norns "engine" is an ordinary SuperCollider class that inherits from
// CroneEngine and registers commands; the rest of norns — the Lua layer, the
// grid, softcut — is not involved in making the sound. So an engine runs on
// plain scsynth given four things, which is all this file provides:
//
//   *new(context, doneCallback)   the constructor shape engines expect
//   alloc                          called once, inside a Routine so that
//                                  server.sync inside it works
//   addCommand / addPoll           registration, kept in a dictionary
//   free                           teardown
//
// Engine_Pappus touches exactly four members of the audio context —
// server, in_b, out_b, xg — so the context can be a plain Event.
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
		// norns runs alloc inside a Routine and only fires doneCallback once
		// it returns. Engines rely on that — Pappus calls server.sync in
		// prAlloc, which needs a thread.
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

	// Not part of norns' interface — this is how a caller without Lua invokes
	// a registered command.
	//
	// ⚠️ The handler is given an ARRAY, and its first argument is msg[1], not
	// msg[0] — norns passes the OSC message with the command name still in
	// slot 0. Engines are written against that: Pappus does
	//     addCommand("amp", "f", { arg msg; synth.set(\amp, msg[1]) })
	// so passing the arguments directly gets `Message 'at' not understood` on
	// an Integer. Rebuild the shape norns would have sent.
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
