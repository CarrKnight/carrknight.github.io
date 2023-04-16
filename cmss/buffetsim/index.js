(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => {
    __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
    return value;
  };

  // src/jssim.ts
  function mulberry32(a) {
    return function() {
      var t = a += 1831565813;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var random = mulberry32(1);
  var exchange = function(a, i, j) {
    var temp = a[i];
    a[i] = a[j];
    a[j] = temp;
  };
  var shuffle = function(a) {
    var n = a.length;
    for (var i = 1; i < n; ++i) {
      var j = Math.floor(random() * (1 + i));
      exchange(a, i, j);
    }
  };
  var s4 = function() {
    return Math.floor((1 + random()) * 65536).toString(16).substring(1);
  };
  var guid = function() {
    return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
  };
  var MinPQ = class {
    constructor(compare) {
      if (!compare) {
        compare = function(a1, a2) {
          return a1 - a2;
        };
      }
      this.s = [];
      this.N = 0;
      this.compare = compare;
    }
    less(a1, a2) {
      return this.compare(a1, a2) < 0;
    }
    enqueue(item) {
      while (this.s.length <= this.N + 1) {
        this.s.push(0);
      }
      this.s[++this.N] = item;
      this.swim(this.N);
    }
    delMin() {
      if (this.N == 0) {
        return null;
      }
      var item = this.s[1];
      exchange(this.s, 1, this.N--);
      this.sink(1);
      return item;
    }
    min() {
      if (this.N == 0) {
        return null;
      }
      return this.s[1];
    }
    sink(k) {
      while (k * 2 <= this.N) {
        var child = k * 2;
        if (child < this.N && this.less(this.s[child + 1], this.s[child])) {
          child++;
        }
        if (this.less(this.s[child], this.s[k])) {
          exchange(this.s, child, k);
          k = child;
        } else {
          break;
        }
      }
    }
    swim(k) {
      while (k > 1) {
        var parent = Math.floor(k / 2);
        if (this.less(this.s[k], this.s[parent])) {
          exchange(this.s, k, parent);
          k = parent;
        } else {
          break;
        }
      }
    }
    clear() {
      this.s = [];
      this.N = 0;
    }
    size() {
      return this.N;
    }
    isEmpty() {
      return this.N == 0;
    }
  };
  var SimEvent = class {
    constructor(rank = null) {
      this.time = 0;
      if (rank) {
        this.rank = rank;
      } else {
        this.rank = 1;
      }
    }
    guid() {
      if (this.id) {
        return this.id;
      } else {
        this.id = guid();
        return this.id;
      }
    }
    sendMsg(recipient, message) {
      this.scheduler.messenger.sendMsg(this.guid(), recipient, message);
    }
    readInBox() {
      return this.scheduler.messenger.readInBox(this.guid());
    }
  };
  var Scheduler = class {
    constructor() {
      this.pq = new MinPQ(function(evt1, evt2) {
        var time_diff = evt1.time - evt2.time;
        if (time_diff == 0) {
          return evt2.rank - evt1.rank;
        } else {
          return time_diff;
        }
      });
      this.current_time = null;
      this.current_rank = null;
      this.messenger = new Messenger(this);
    }
    getNextTime() {
      if (this.pq.isEmpty())
        return null;
      else
        return this.pq.min().time;
    }
    update() {
      var current_rank = null;
      var current_time = null;
      while (!this.pq.isEmpty()) {
        var evt = this.pq.min();
        var time = evt.time;
        var rank = evt.rank;
        if (current_time == null) {
          current_time = time;
        } else if (current_time != time) {
          break;
        }
        this.update_mini();
      }
      this.messenger.update(0);
    }
    update_mini() {
      var current_time = null;
      var current_rank = null;
      var events = [];
      while (!this.pq.isEmpty()) {
        var evt = this.pq.min();
        var time = evt.time;
        var rank = evt.rank;
        if (current_time == null) {
          current_time = time;
        } else if (current_time != time) {
          break;
        }
        if (current_rank == null) {
          current_rank = rank;
        } else if (current_rank != rank) {
          break;
        }
        events.push(this.pq.delMin());
      }
      shuffle(events);
      var old_time = this.current_time;
      if (events.length > 0) {
        this.current_time = current_time;
        this.current_rank = current_rank;
      }
      for (var i = 0; i < events.length; ++i) {
        var deltaTime = 0;
        if (this.current_time != null) {
          if (current_time === null)
            throw new Error("should not be null!");
          deltaTime = current_time - old_time;
        } else {
          deltaTime = current_time;
        }
        if (!events[i].update) {
          console.log("event does not define update(deltaTime) method!!!");
        } else {
          events[i].update(deltaTime);
        }
      }
      for (var i = 0; i < events.length; ++i) {
        if (events[i].repeatInterval) {
          this.scheduleRepeatingAt(events[i], this.current_time + events[i].repeatInterval, events[i].repeatInterval);
        }
      }
      return events;
    }
    schedule(evt, time) {
      evt.time = time;
      if (!evt.scheduler) {
        evt.scheduler = this;
      }
      this.pq.enqueue(evt);
    }
    hasEvents() {
      return !this.pq.isEmpty();
    }
    // Method that schedules an event to fire once at delta time later (than the current time) 
    scheduleOnceIn(evt, deltaTime) {
      var start_time = this.current_time;
      if (this.current_time == null) {
        start_time = 0;
      }
      if (!evt.scheduler) {
        evt.scheduler = this;
      }
      evt.time = start_time + deltaTime;
      this.pq.enqueue(evt);
    }
    // Method that schedules an event to fire at interval of delta time from now on (other than the current time)
    scheduleRepeatingIn(evt, deltaTime) {
      var start_time = this.current_time;
      if (this.current_time == null) {
        start_time = 0;
      }
      if (!evt.scheduler) {
        evt.scheduler = this;
      }
      this.scheduleRepeatingAt(evt, start_time + deltaTime, deltaTime);
    }
    // Method that schedules an event to fire at interval of delta time, with first event fired at the time specified
    scheduleRepeatingAt(evt, startTime, deltaTime) {
      evt.time = startTime;
      evt.repeatInterval = deltaTime;
      if (!evt.scheduler) {
        evt.scheduler = this;
      }
      this.pq.enqueue(evt);
    }
    reset() {
      this.current_rank = null;
      this.current_time = null;
      this.pq.clear();
      this.messenger.reset();
    }
  };
  var Messenger = class {
    update(deltaTime) {
      for (const recipient in this.inbox) {
        var recipient_inbox = this.inbox[recipient];
        if (recipient_inbox.size() > 10) {
          var sender_msg = recipient_inbox.min();
          while (sender_msg != null && sender_msg.time < this.scheduler.current_time) {
            recipient_inbox.delMin();
            if (recipient_inbox.isEmpty()) {
              break;
            }
            sender_msg = recipient_inbox.min();
          }
        }
      }
    }
    sendMsg(sender, recipient, message) {
      if (!message.recipient) {
        message.recipient = recipient;
      }
      if (!message.sender) {
        message.sender = sender;
      }
      var recipient_inbox;
      if (recipient in this.inbox) {
        recipient_inbox = this.inbox[recipient];
      } else {
        recipient_inbox = new MinPQ(function(m1, m2) {
          var diff = m1.time - m2.time;
          if (diff == 0) {
            return m1.rank - m2.rank;
          } else {
            return diff;
          }
        });
        this.inbox[recipient] = recipient_inbox;
      }
      if (!message.rank) {
        message.rank = 1;
      }
      if (!message.time) {
        message.time = this.scheduler.current_time;
      }
      recipient_inbox.enqueue(message);
    }
    reset() {
      this.inbox = [];
    }
    readInBox(recipient) {
      var recipient_inbox;
      if (recipient in this.inbox) {
        recipient_inbox = this.inbox[recipient];
      } else {
        recipient_inbox = new MinPQ(function(m1, m2) {
          var diff = m1.time - m2.time;
          if (diff == 0) {
            return m1.rank - m2.rank;
          } else {
            return diff;
          }
        });
        this.inbox[recipient] = recipient_inbox;
      }
      var sender_msg = recipient_inbox.min();
      var result = [];
      while (sender_msg != null && sender_msg.time <= this.scheduler.current_time) {
        recipient_inbox.delMin();
        result.push(sender_msg);
        if (recipient_inbox.isEmpty()) {
          break;
        }
        sender_msg = recipient_inbox.min();
      }
      return result;
    }
    constructor(scheduler) {
      new SimEvent(-1e9);
      this.inbox = {};
      this.scheduler = scheduler;
    }
  };

  // src/model.ts
  var asserts = true;
  var idCounter = 0;
  var generateNewGroup = function(state) {
    const newGroup = new Group();
    for (let i = 0; i < state.simulationParameters.groupSize; i++) {
      const person = {
        id: (idCounter++).toString(),
        amountEatenInKg: 0,
        foodWastedInKg: 0,
        currentAction: null,
        group: newGroup,
        plateHeld: null,
        wastePercentage: state.simulationParameters.wastePercentage
      };
      newGroup.members.push(person);
      state.peopleInStore.push(person);
    }
    const freeTable = state.allTables.find(
      (table) => table.group == null
    );
    if (freeTable === void 0) {
      state.groupsWaitingToBeServed.push(newGroup);
    } else {
      sitNewGroupAtNewTable(newGroup, freeTable, state);
    }
    state.scheduler.scheduleOnceIn(
      new class extends SimEvent {
        update() {
          console.log("New group at time " + state.scheduler.current_time);
        }
      }(),
      state.simulationParameters.arrivalInterval
    );
  };
  var PersonAction = class {
    constructor(person) {
      this.person = person;
    }
  };
  var Entering = class extends PersonAction {
    act(state) {
      if (this.person.group.assignedTable == null)
        throw new Error("didn't give this person a table!");
      if (asserts && this.person.group.assignedTable.sitting.includes(this.person))
        throw new Error("This person is trying to sit twice!!");
      this.person.group.assignedTable.sitting.push(this.person);
      return {
        previousAction: this,
        // previous action was Entering
        nextAction: new LookForFood(this.person),
        // next action is to look for food
        waitType: state.simulationParameters.setupTime
        // take the next action after a delay specified by simulationParameters.setupTime
      };
    }
  };
  var Exiting = class extends PersonAction {
    act(state) {
      if (this.person.group.assignedTable == null)
        throw new Error("This person is trying to exit without having a table");
      if (asserts && !this.person.group.assignedTable.sitting.includes(this.person))
        throw new Error("This person is standing up without ever sitting down!");
      this.person.group.assignedTable.sitting = this.person.group.assignedTable.sitting.filter(
        (person) => person != this.person
      );
      state.peopleInStore = state.peopleInStore.filter(
        (item) => item != this.person
      );
      state.peopleWhoLeft.push(this.person);
      this.person.group.numberOfPeopleWhoLeft += 1;
      return {
        previousAction: this,
        nextAction: null,
        waitType: "queue"
      };
    }
  };
  var StartEating = class extends PersonAction {
    //start eating and wait till you are done
    act(state) {
      return {
        previousAction: this,
        waitType: state.simulationParameters.eatingTime,
        nextAction: new FinishedEating(this.person)
      };
    }
  };
  var FinishedEating = class extends PersonAction {
    act(state) {
      let plate = this.person.plateHeld;
      if (plate == null)
        throw new Error("Trying to eat without a plate!");
      let waste = plate.foodOnPlateInKG * this.person.wastePercentage;
      this.person.foodWastedInKg += waste;
      state.totalWasteInKg += waste;
      this.person.amountEatenInKg += plate.foodOnPlateInKG - waste;
      this.person.plateHeld = null;
      return {
        previousAction: this,
        waitType: "queue",
        nextAction: new WaitingForConsensus(this.person)
      };
    }
  };
  var WaitingForConsensus = class extends PersonAction {
    constructor() {
      super(...arguments);
      this.decidedToGo = null;
    }
    act(state) {
      if (asserts && this.decidedToGo == null) {
        throw new Error("Stopped waiting without deciding where to go!");
      }
      if (this.decidedToGo == false)
        return {
          previousAction: this,
          waitType: "immediately",
          nextAction: new Exiting(this.person)
        };
      else
        return {
          previousAction: this,
          waitType: "immediately",
          nextAction: new LookForFood(this.person)
        };
    }
  };
  var LookForFood = class extends PersonAction {
    //queue up
    act(state) {
      if (this.person.group.assignedTable == null)
        throw new Error("didn't give this person a table to stand from!");
      if (asserts && !this.person.group.assignedTable.sitting.includes(this.person))
        throw new Error("This person is standing up without ever sitting down!");
      this.person.group.assignedTable.sitting = this.person.group.assignedTable.sitting.filter(
        (person) => person != this.person
      );
      let bestFoodStation = state.foodStations[0];
      let shortestQueue = bestFoodStation.queue.length;
      for (let i = 1; i < state.foodStations.length; i++) {
        if (shortestQueue == 0)
          break;
        const queueLength = state.foodStations[i].queue.length;
        if (queueLength < shortestQueue) {
          shortestQueue = queueLength;
          bestFoodStation = state.foodStations[i];
        }
      }
      bestFoodStation.queue.push(this.person);
      return {
        previousAction: this,
        waitType: "queue",
        nextAction: new QueuingAtStation(this.person, bestFoodStation)
      };
    }
  };
  var QueuingAtStation = class extends PersonAction {
    constructor(person, foodStation) {
      super(person);
      this.foodStation = foodStation;
    }
    act(state) {
      if (asserts && (!this.foodStation.inUse || this.foodStation.queue[0] != this.person))
        throw new Error("Serving the wrong person!");
      if (asserts && this.person.plateHeld != null)
        throw new Error("Double serving not implemented yet!");
      this.person.plateHeld = {
        foodOnPlateInKG: state.simulationParameters.foodGrabbedInKg
      };
      this.foodStation.inUse = false;
      this.foodStation.queue.shift();
      if (this.person.group.assignedTable == null)
        throw new Error("didn't give this person a table!");
      if (asserts && this.person.group.assignedTable.sitting.includes(this.person))
        throw new Error("This person is trying to sit twice!!");
      this.person.group.assignedTable.sitting.push(this.person);
      return {
        nextAction: new StartEating(this.person),
        previousAction: this,
        waitType: state.simulationParameters.tableToFoodStationTime
      };
    }
  };
  var Group = class {
    constructor() {
      /**
       * the people that make up this group
       */
      this.members = [];
      this.numberOfPeopleWhoLeft = 0;
      this.assignedTable = null;
    }
    shallWeEatMore() {
      return random() < 0.2;
    }
    isEverybodyWaitingForADecision() {
      for (const member of this.members) {
        if (!(member.currentAction instanceof WaitingForConsensus)) {
          return false;
        }
      }
      return true;
    }
    isEverybodyGone() {
      return this.numberOfPeopleWhoLeft >= this.members.length;
    }
    //todo decision on whether to eat more or quitting
    //if quitting then trigger exit action for everyone...
    //leave the table
    //self destroy?
  };
  var StateMachineStep = class extends SimEvent {
    constructor(action, state) {
      super();
      this.action = action;
      this.state = state;
    }
    update() {
      console.log(
        "At time " + this.state.scheduler.current_time + " person " + this.action.person.id + " is just about to accomplish action " + this.action.constructor.name
      );
      console.log(
        "next action will occur at time step... " + this.state.scheduler.getNextTime()
      );
      if (asserts && this.action.person.currentAction != this.action)
        throw new Error(
          "Mismatch between what is happening and what the person think is happening ( " + this.action.person.currentAction?.constructor.name + " vs " + this.action.constructor.name + ")"
        );
      const actionResolution = this.action.act(this.state);
      console.log(
        "Action completed, the resolution is " + actionResolution.nextAction?.constructor.name
      );
      this.action.person.currentAction = actionResolution.nextAction;
      if (actionResolution.waitType == "immediately" && actionResolution.nextAction != null)
        new StateMachineStep(actionResolution.nextAction, this.state).update();
      else {
        if (actionResolution.waitType == "queue" || actionResolution.nextAction == null) {
        } else {
          this.state.scheduler.scheduleOnceIn(
            new StateMachineStep(actionResolution.nextAction, this.state),
            actionResolution.waitType
          );
        }
      }
      const nextAction = actionResolution.nextAction;
      if (nextAction instanceof QueuingAtStation) {
        const foodStation = nextAction.foodStation;
        if (!foodStation.inUse) {
          if (foodStation.queue.length == 1 && foodStation.queue[0] == this.action.person) {
            foodStation.inUse = true;
            this.state.scheduler.scheduleOnceIn(
              new StateMachineStep(nextAction, this.state),
              foodStation.servingTime
            );
          }
        }
      }
      if (this.action instanceof QueuingAtStation) {
        const foodStation = this.action.foodStation;
        if (foodStation.inUse)
          throw new Error("food station is in use; it shouldn't be: we just got out");
        if (foodStation.queue.length > 0) {
          if (asserts && foodStation.queue[0] == this.action.person)
            throw new Error("this person didn't get out of the queue correctly");
          const nextGuy = foodStation.queue[0];
          if (!(nextGuy.currentAction instanceof QueuingAtStation))
            throw new Error("person is waiting, but its action is not waiting...");
          foodStation.inUse = true;
          this.state.scheduler.scheduleOnceIn(
            new StateMachineStep(nextGuy.currentAction, this.state),
            foodStation.servingTime
          );
        }
      }
      if (nextAction instanceof WaitingForConsensus) {
        const group = nextAction.person.group;
        if (group.isEverybodyWaitingForADecision()) {
          const eatMore = group.shallWeEatMore();
          for (const p of nextAction.person.group.members) {
            if (!(p.currentAction instanceof WaitingForConsensus))
              throw new Error("Can't be right! You need to be waiting for consensus here!");
            p.currentAction.decidedToGo = eatMore;
            new StateMachineStep(p.currentAction, this.state).update();
          }
        }
      }
      if (nextAction instanceof Exiting && nextAction.person.group.isEverybodyGone()) {
        if (nextAction.person.group == null || nextAction.person.group.assignedTable == null)
          throw new Error("No group/table to quit!");
        const freeTable = nextAction.person.group.assignedTable;
        freeTable.group = null;
        freeTable.sitting = [];
        const nextGroup = this.state.groupsWaitingToBeServed.shift();
        if (!(nextGroup === void 0)) {
          sitNewGroupAtNewTable(nextGroup, freeTable, this.state);
        }
      }
    }
  };
  var firstStep = function(state) {
    return new class extends SimEvent {
      update() {
        generateNewGroup(state);
      }
    }();
  };
  function sitNewGroupAtNewTable(newGroup, freeTable, state) {
    newGroup.assignedTable = freeTable;
    freeTable.group = newGroup;
    for (const p of newGroup.members) {
      const action = new Entering(p);
      p.currentAction = action;
      state.scheduler.scheduleOnceIn(
        new StateMachineStep(
          action,
          state
        ),
        state.simulationParameters.enteringTime
      );
    }
  }

  // node_modules/d3-array/src/ascending.js
  function ascending(a, b) {
    return a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  // node_modules/d3-array/src/descending.js
  function descending(a, b) {
    return a == null || b == null ? NaN : b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
  }

  // node_modules/d3-array/src/bisector.js
  function bisector(f) {
    let compare1, compare2, delta;
    if (f.length !== 2) {
      compare1 = ascending;
      compare2 = (d, x) => ascending(f(d), x);
      delta = (d, x) => f(d) - x;
    } else {
      compare1 = f === ascending || f === descending ? f : zero;
      compare2 = f;
      delta = f;
    }
    function left(a, x, lo = 0, hi = a.length) {
      if (lo < hi) {
        if (compare1(x, x) !== 0)
          return hi;
        do {
          const mid = lo + hi >>> 1;
          if (compare2(a[mid], x) < 0)
            lo = mid + 1;
          else
            hi = mid;
        } while (lo < hi);
      }
      return lo;
    }
    function right(a, x, lo = 0, hi = a.length) {
      if (lo < hi) {
        if (compare1(x, x) !== 0)
          return hi;
        do {
          const mid = lo + hi >>> 1;
          if (compare2(a[mid], x) <= 0)
            lo = mid + 1;
          else
            hi = mid;
        } while (lo < hi);
      }
      return lo;
    }
    function center(a, x, lo = 0, hi = a.length) {
      const i = left(a, x, lo, hi - 1);
      return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
    }
    return { left, center, right };
  }
  function zero() {
    return 0;
  }

  // node_modules/d3-array/src/number.js
  function number(x) {
    return x === null ? NaN : +x;
  }

  // node_modules/d3-array/src/bisect.js
  var ascendingBisect = bisector(ascending);
  var bisectRight = ascendingBisect.right;
  var bisectLeft = ascendingBisect.left;
  var bisectCenter = bisector(number).center;
  var bisect_default = bisectRight;

  // node_modules/d3-array/src/ticks.js
  var e10 = Math.sqrt(50);
  var e5 = Math.sqrt(10);
  var e2 = Math.sqrt(2);
  function tickSpec(start2, stop, count) {
    const step = (stop - start2) / Math.max(0, count), power = Math.floor(Math.log10(step)), error = step / Math.pow(10, power), factor = error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1;
    let i1, i2, inc;
    if (power < 0) {
      inc = Math.pow(10, -power) / factor;
      i1 = Math.round(start2 * inc);
      i2 = Math.round(stop * inc);
      if (i1 / inc < start2)
        ++i1;
      if (i2 / inc > stop)
        --i2;
      inc = -inc;
    } else {
      inc = Math.pow(10, power) * factor;
      i1 = Math.round(start2 / inc);
      i2 = Math.round(stop / inc);
      if (i1 * inc < start2)
        ++i1;
      if (i2 * inc > stop)
        --i2;
    }
    if (i2 < i1 && 0.5 <= count && count < 2)
      return tickSpec(start2, stop, count * 2);
    return [i1, i2, inc];
  }
  function ticks(start2, stop, count) {
    stop = +stop, start2 = +start2, count = +count;
    if (!(count > 0))
      return [];
    if (start2 === stop)
      return [start2];
    const reverse = stop < start2, [i1, i2, inc] = reverse ? tickSpec(stop, start2, count) : tickSpec(start2, stop, count);
    if (!(i2 >= i1))
      return [];
    const n = i2 - i1 + 1, ticks2 = new Array(n);
    if (reverse) {
      if (inc < 0)
        for (let i = 0; i < n; ++i)
          ticks2[i] = (i2 - i) / -inc;
      else
        for (let i = 0; i < n; ++i)
          ticks2[i] = (i2 - i) * inc;
    } else {
      if (inc < 0)
        for (let i = 0; i < n; ++i)
          ticks2[i] = (i1 + i) / -inc;
      else
        for (let i = 0; i < n; ++i)
          ticks2[i] = (i1 + i) * inc;
    }
    return ticks2;
  }
  function tickIncrement(start2, stop, count) {
    stop = +stop, start2 = +start2, count = +count;
    return tickSpec(start2, stop, count)[2];
  }
  function tickStep(start2, stop, count) {
    stop = +stop, start2 = +start2, count = +count;
    const reverse = stop < start2, inc = reverse ? tickIncrement(stop, start2, count) : tickIncrement(start2, stop, count);
    return (reverse ? -1 : 1) * (inc < 0 ? 1 / -inc : inc);
  }

  // node_modules/d3-dispatch/src/dispatch.js
  var noop = { value: () => {
  } };
  function dispatch() {
    for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
      if (!(t = arguments[i] + "") || t in _ || /[\s.]/.test(t))
        throw new Error("illegal type: " + t);
      _[t] = [];
    }
    return new Dispatch(_);
  }
  function Dispatch(_) {
    this._ = _;
  }
  function parseTypenames(typenames, types) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name2 = "", i = t.indexOf(".");
      if (i >= 0)
        name2 = t.slice(i + 1), t = t.slice(0, i);
      if (t && !types.hasOwnProperty(t))
        throw new Error("unknown type: " + t);
      return { type: t, name: name2 };
    });
  }
  Dispatch.prototype = dispatch.prototype = {
    constructor: Dispatch,
    on: function(typename, callback2) {
      var _ = this._, T = parseTypenames(typename + "", _), t, i = -1, n = T.length;
      if (arguments.length < 2) {
        while (++i < n)
          if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name)))
            return t;
        return;
      }
      if (callback2 != null && typeof callback2 !== "function")
        throw new Error("invalid callback: " + callback2);
      while (++i < n) {
        if (t = (typename = T[i]).type)
          _[t] = set(_[t], typename.name, callback2);
        else if (callback2 == null)
          for (t in _)
            _[t] = set(_[t], typename.name, null);
      }
      return this;
    },
    copy: function() {
      var copy2 = {}, _ = this._;
      for (var t in _)
        copy2[t] = _[t].slice();
      return new Dispatch(copy2);
    },
    call: function(type2, that) {
      if ((n = arguments.length - 2) > 0)
        for (var args = new Array(n), i = 0, n, t; i < n; ++i)
          args[i] = arguments[i + 2];
      if (!this._.hasOwnProperty(type2))
        throw new Error("unknown type: " + type2);
      for (t = this._[type2], i = 0, n = t.length; i < n; ++i)
        t[i].value.apply(that, args);
    },
    apply: function(type2, that, args) {
      if (!this._.hasOwnProperty(type2))
        throw new Error("unknown type: " + type2);
      for (var t = this._[type2], i = 0, n = t.length; i < n; ++i)
        t[i].value.apply(that, args);
    }
  };
  function get(type2, name2) {
    for (var i = 0, n = type2.length, c; i < n; ++i) {
      if ((c = type2[i]).name === name2) {
        return c.value;
      }
    }
  }
  function set(type2, name2, callback2) {
    for (var i = 0, n = type2.length; i < n; ++i) {
      if (type2[i].name === name2) {
        type2[i] = noop, type2 = type2.slice(0, i).concat(type2.slice(i + 1));
        break;
      }
    }
    if (callback2 != null)
      type2.push({ name: name2, value: callback2 });
    return type2;
  }
  var dispatch_default = dispatch;

  // node_modules/d3-selection/src/namespaces.js
  var xhtml = "http://www.w3.org/1999/xhtml";
  var namespaces_default = {
    svg: "http://www.w3.org/2000/svg",
    xhtml,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };

  // node_modules/d3-selection/src/namespace.js
  function namespace_default(name2) {
    var prefix = name2 += "", i = prefix.indexOf(":");
    if (i >= 0 && (prefix = name2.slice(0, i)) !== "xmlns")
      name2 = name2.slice(i + 1);
    return namespaces_default.hasOwnProperty(prefix) ? { space: namespaces_default[prefix], local: name2 } : name2;
  }

  // node_modules/d3-selection/src/creator.js
  function creatorInherit(name2) {
    return function() {
      var document2 = this.ownerDocument, uri = this.namespaceURI;
      return uri === xhtml && document2.documentElement.namespaceURI === xhtml ? document2.createElement(name2) : document2.createElementNS(uri, name2);
    };
  }
  function creatorFixed(fullname) {
    return function() {
      return this.ownerDocument.createElementNS(fullname.space, fullname.local);
    };
  }
  function creator_default(name2) {
    var fullname = namespace_default(name2);
    return (fullname.local ? creatorFixed : creatorInherit)(fullname);
  }

  // node_modules/d3-selection/src/selector.js
  function none() {
  }
  function selector_default(selector) {
    return selector == null ? none : function() {
      return this.querySelector(selector);
    };
  }

  // node_modules/d3-selection/src/selection/select.js
  function select_default(select) {
    if (typeof select !== "function")
      select = selector_default(select);
    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node)
            subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
        }
      }
    }
    return new Selection(subgroups, this._parents);
  }

  // node_modules/d3-selection/src/array.js
  function array(x) {
    return x == null ? [] : Array.isArray(x) ? x : Array.from(x);
  }

  // node_modules/d3-selection/src/selectorAll.js
  function empty() {
    return [];
  }
  function selectorAll_default(selector) {
    return selector == null ? empty : function() {
      return this.querySelectorAll(selector);
    };
  }

  // node_modules/d3-selection/src/selection/selectAll.js
  function arrayAll(select) {
    return function() {
      return array(select.apply(this, arguments));
    };
  }
  function selectAll_default(select) {
    if (typeof select === "function")
      select = arrayAll(select);
    else
      select = selectorAll_default(select);
    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          subgroups.push(select.call(node, node.__data__, i, group));
          parents.push(node);
        }
      }
    }
    return new Selection(subgroups, parents);
  }

  // node_modules/d3-selection/src/matcher.js
  function matcher_default(selector) {
    return function() {
      return this.matches(selector);
    };
  }
  function childMatcher(selector) {
    return function(node) {
      return node.matches(selector);
    };
  }

  // node_modules/d3-selection/src/selection/selectChild.js
  var find = Array.prototype.find;
  function childFind(match) {
    return function() {
      return find.call(this.children, match);
    };
  }
  function childFirst() {
    return this.firstElementChild;
  }
  function selectChild_default(match) {
    return this.select(match == null ? childFirst : childFind(typeof match === "function" ? match : childMatcher(match)));
  }

  // node_modules/d3-selection/src/selection/selectChildren.js
  var filter = Array.prototype.filter;
  function children() {
    return Array.from(this.children);
  }
  function childrenFilter(match) {
    return function() {
      return filter.call(this.children, match);
    };
  }
  function selectChildren_default(match) {
    return this.selectAll(match == null ? children : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
  }

  // node_modules/d3-selection/src/selection/filter.js
  function filter_default(match) {
    if (typeof match !== "function")
      match = matcher_default(match);
    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }
    return new Selection(subgroups, this._parents);
  }

  // node_modules/d3-selection/src/selection/sparse.js
  function sparse_default(update) {
    return new Array(update.length);
  }

  // node_modules/d3-selection/src/selection/enter.js
  function enter_default() {
    return new Selection(this._enter || this._groups.map(sparse_default), this._parents);
  }
  function EnterNode(parent, datum2) {
    this.ownerDocument = parent.ownerDocument;
    this.namespaceURI = parent.namespaceURI;
    this._next = null;
    this._parent = parent;
    this.__data__ = datum2;
  }
  EnterNode.prototype = {
    constructor: EnterNode,
    appendChild: function(child) {
      return this._parent.insertBefore(child, this._next);
    },
    insertBefore: function(child, next) {
      return this._parent.insertBefore(child, next);
    },
    querySelector: function(selector) {
      return this._parent.querySelector(selector);
    },
    querySelectorAll: function(selector) {
      return this._parent.querySelectorAll(selector);
    }
  };

  // node_modules/d3-selection/src/constant.js
  function constant_default(x) {
    return function() {
      return x;
    };
  }

  // node_modules/d3-selection/src/selection/data.js
  function bindIndex(parent, group, enter, update, exit, data) {
    var i = 0, node, groupLength = group.length, dataLength = data.length;
    for (; i < dataLength; ++i) {
      if (node = group[i]) {
        node.__data__ = data[i];
        update[i] = node;
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }
    for (; i < groupLength; ++i) {
      if (node = group[i]) {
        exit[i] = node;
      }
    }
  }
  function bindKey(parent, group, enter, update, exit, data, key) {
    var i, node, nodeByKeyValue = /* @__PURE__ */ new Map(), groupLength = group.length, dataLength = data.length, keyValues = new Array(groupLength), keyValue;
    for (i = 0; i < groupLength; ++i) {
      if (node = group[i]) {
        keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
        if (nodeByKeyValue.has(keyValue)) {
          exit[i] = node;
        } else {
          nodeByKeyValue.set(keyValue, node);
        }
      }
    }
    for (i = 0; i < dataLength; ++i) {
      keyValue = key.call(parent, data[i], i, data) + "";
      if (node = nodeByKeyValue.get(keyValue)) {
        update[i] = node;
        node.__data__ = data[i];
        nodeByKeyValue.delete(keyValue);
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }
    for (i = 0; i < groupLength; ++i) {
      if ((node = group[i]) && nodeByKeyValue.get(keyValues[i]) === node) {
        exit[i] = node;
      }
    }
  }
  function datum(node) {
    return node.__data__;
  }
  function data_default(value, key) {
    if (!arguments.length)
      return Array.from(this, datum);
    var bind = key ? bindKey : bindIndex, parents = this._parents, groups = this._groups;
    if (typeof value !== "function")
      value = constant_default(value);
    for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
      var parent = parents[j], group = groups[j], groupLength = group.length, data = arraylike(value.call(parent, parent && parent.__data__, j, parents)), dataLength = data.length, enterGroup = enter[j] = new Array(dataLength), updateGroup = update[j] = new Array(dataLength), exitGroup = exit[j] = new Array(groupLength);
      bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);
      for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
        if (previous = enterGroup[i0]) {
          if (i0 >= i1)
            i1 = i0 + 1;
          while (!(next = updateGroup[i1]) && ++i1 < dataLength)
            ;
          previous._next = next || null;
        }
      }
    }
    update = new Selection(update, parents);
    update._enter = enter;
    update._exit = exit;
    return update;
  }
  function arraylike(data) {
    return typeof data === "object" && "length" in data ? data : Array.from(data);
  }

  // node_modules/d3-selection/src/selection/exit.js
  function exit_default() {
    return new Selection(this._exit || this._groups.map(sparse_default), this._parents);
  }

  // node_modules/d3-selection/src/selection/join.js
  function join_default(onenter, onupdate, onexit) {
    var enter = this.enter(), update = this, exit = this.exit();
    if (typeof onenter === "function") {
      enter = onenter(enter);
      if (enter)
        enter = enter.selection();
    } else {
      enter = enter.append(onenter + "");
    }
    if (onupdate != null) {
      update = onupdate(update);
      if (update)
        update = update.selection();
    }
    if (onexit == null)
      exit.remove();
    else
      onexit(exit);
    return enter && update ? enter.merge(update).order() : update;
  }

  // node_modules/d3-selection/src/selection/merge.js
  function merge_default(context) {
    var selection2 = context.selection ? context.selection() : context;
    for (var groups0 = this._groups, groups1 = selection2._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge2 = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge2[i] = node;
        }
      }
    }
    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }
    return new Selection(merges, this._parents);
  }

  // node_modules/d3-selection/src/selection/order.js
  function order_default() {
    for (var groups = this._groups, j = -1, m = groups.length; ++j < m; ) {
      for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0; ) {
        if (node = group[i]) {
          if (next && node.compareDocumentPosition(next) ^ 4)
            next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }
    return this;
  }

  // node_modules/d3-selection/src/selection/sort.js
  function sort_default(compare) {
    if (!compare)
      compare = ascending2;
    function compareNode(a, b) {
      return a && b ? compare(a.__data__, b.__data__) : !a - !b;
    }
    for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          sortgroup[i] = node;
        }
      }
      sortgroup.sort(compareNode);
    }
    return new Selection(sortgroups, this._parents).order();
  }
  function ascending2(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  // node_modules/d3-selection/src/selection/call.js
  function call_default() {
    var callback2 = arguments[0];
    arguments[0] = this;
    callback2.apply(null, arguments);
    return this;
  }

  // node_modules/d3-selection/src/selection/nodes.js
  function nodes_default() {
    return Array.from(this);
  }

  // node_modules/d3-selection/src/selection/node.js
  function node_default() {
    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
        var node = group[i];
        if (node)
          return node;
      }
    }
    return null;
  }

  // node_modules/d3-selection/src/selection/size.js
  function size_default() {
    let size = 0;
    for (const node of this)
      ++size;
    return size;
  }

  // node_modules/d3-selection/src/selection/empty.js
  function empty_default() {
    return !this.node();
  }

  // node_modules/d3-selection/src/selection/each.js
  function each_default(callback2) {
    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i])
          callback2.call(node, node.__data__, i, group);
      }
    }
    return this;
  }

  // node_modules/d3-selection/src/selection/attr.js
  function attrRemove(name2) {
    return function() {
      this.removeAttribute(name2);
    };
  }
  function attrRemoveNS(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }
  function attrConstant(name2, value) {
    return function() {
      this.setAttribute(name2, value);
    };
  }
  function attrConstantNS(fullname, value) {
    return function() {
      this.setAttributeNS(fullname.space, fullname.local, value);
    };
  }
  function attrFunction(name2, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null)
        this.removeAttribute(name2);
      else
        this.setAttribute(name2, v);
    };
  }
  function attrFunctionNS(fullname, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null)
        this.removeAttributeNS(fullname.space, fullname.local);
      else
        this.setAttributeNS(fullname.space, fullname.local, v);
    };
  }
  function attr_default(name2, value) {
    var fullname = namespace_default(name2);
    if (arguments.length < 2) {
      var node = this.node();
      return fullname.local ? node.getAttributeNS(fullname.space, fullname.local) : node.getAttribute(fullname);
    }
    return this.each((value == null ? fullname.local ? attrRemoveNS : attrRemove : typeof value === "function" ? fullname.local ? attrFunctionNS : attrFunction : fullname.local ? attrConstantNS : attrConstant)(fullname, value));
  }

  // node_modules/d3-selection/src/window.js
  function window_default(node) {
    return node.ownerDocument && node.ownerDocument.defaultView || node.document && node || node.defaultView;
  }

  // node_modules/d3-selection/src/selection/style.js
  function styleRemove(name2) {
    return function() {
      this.style.removeProperty(name2);
    };
  }
  function styleConstant(name2, value, priority) {
    return function() {
      this.style.setProperty(name2, value, priority);
    };
  }
  function styleFunction(name2, value, priority) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null)
        this.style.removeProperty(name2);
      else
        this.style.setProperty(name2, v, priority);
    };
  }
  function style_default(name2, value, priority) {
    return arguments.length > 1 ? this.each((value == null ? styleRemove : typeof value === "function" ? styleFunction : styleConstant)(name2, value, priority == null ? "" : priority)) : styleValue(this.node(), name2);
  }
  function styleValue(node, name2) {
    return node.style.getPropertyValue(name2) || window_default(node).getComputedStyle(node, null).getPropertyValue(name2);
  }

  // node_modules/d3-selection/src/selection/property.js
  function propertyRemove(name2) {
    return function() {
      delete this[name2];
    };
  }
  function propertyConstant(name2, value) {
    return function() {
      this[name2] = value;
    };
  }
  function propertyFunction(name2, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null)
        delete this[name2];
      else
        this[name2] = v;
    };
  }
  function property_default(name2, value) {
    return arguments.length > 1 ? this.each((value == null ? propertyRemove : typeof value === "function" ? propertyFunction : propertyConstant)(name2, value)) : this.node()[name2];
  }

  // node_modules/d3-selection/src/selection/classed.js
  function classArray(string) {
    return string.trim().split(/^|\s+/);
  }
  function classList(node) {
    return node.classList || new ClassList(node);
  }
  function ClassList(node) {
    this._node = node;
    this._names = classArray(node.getAttribute("class") || "");
  }
  ClassList.prototype = {
    add: function(name2) {
      var i = this._names.indexOf(name2);
      if (i < 0) {
        this._names.push(name2);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    remove: function(name2) {
      var i = this._names.indexOf(name2);
      if (i >= 0) {
        this._names.splice(i, 1);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    contains: function(name2) {
      return this._names.indexOf(name2) >= 0;
    }
  };
  function classedAdd(node, names2) {
    var list = classList(node), i = -1, n = names2.length;
    while (++i < n)
      list.add(names2[i]);
  }
  function classedRemove(node, names2) {
    var list = classList(node), i = -1, n = names2.length;
    while (++i < n)
      list.remove(names2[i]);
  }
  function classedTrue(names2) {
    return function() {
      classedAdd(this, names2);
    };
  }
  function classedFalse(names2) {
    return function() {
      classedRemove(this, names2);
    };
  }
  function classedFunction(names2, value) {
    return function() {
      (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names2);
    };
  }
  function classed_default(name2, value) {
    var names2 = classArray(name2 + "");
    if (arguments.length < 2) {
      var list = classList(this.node()), i = -1, n = names2.length;
      while (++i < n)
        if (!list.contains(names2[i]))
          return false;
      return true;
    }
    return this.each((typeof value === "function" ? classedFunction : value ? classedTrue : classedFalse)(names2, value));
  }

  // node_modules/d3-selection/src/selection/text.js
  function textRemove() {
    this.textContent = "";
  }
  function textConstant(value) {
    return function() {
      this.textContent = value;
    };
  }
  function textFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.textContent = v == null ? "" : v;
    };
  }
  function text_default(value) {
    return arguments.length ? this.each(value == null ? textRemove : (typeof value === "function" ? textFunction : textConstant)(value)) : this.node().textContent;
  }

  // node_modules/d3-selection/src/selection/html.js
  function htmlRemove() {
    this.innerHTML = "";
  }
  function htmlConstant(value) {
    return function() {
      this.innerHTML = value;
    };
  }
  function htmlFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.innerHTML = v == null ? "" : v;
    };
  }
  function html_default(value) {
    return arguments.length ? this.each(value == null ? htmlRemove : (typeof value === "function" ? htmlFunction : htmlConstant)(value)) : this.node().innerHTML;
  }

  // node_modules/d3-selection/src/selection/raise.js
  function raise() {
    if (this.nextSibling)
      this.parentNode.appendChild(this);
  }
  function raise_default() {
    return this.each(raise);
  }

  // node_modules/d3-selection/src/selection/lower.js
  function lower() {
    if (this.previousSibling)
      this.parentNode.insertBefore(this, this.parentNode.firstChild);
  }
  function lower_default() {
    return this.each(lower);
  }

  // node_modules/d3-selection/src/selection/append.js
  function append_default(name2) {
    var create2 = typeof name2 === "function" ? name2 : creator_default(name2);
    return this.select(function() {
      return this.appendChild(create2.apply(this, arguments));
    });
  }

  // node_modules/d3-selection/src/selection/insert.js
  function constantNull() {
    return null;
  }
  function insert_default(name2, before) {
    var create2 = typeof name2 === "function" ? name2 : creator_default(name2), select = before == null ? constantNull : typeof before === "function" ? before : selector_default(before);
    return this.select(function() {
      return this.insertBefore(create2.apply(this, arguments), select.apply(this, arguments) || null);
    });
  }

  // node_modules/d3-selection/src/selection/remove.js
  function remove() {
    var parent = this.parentNode;
    if (parent)
      parent.removeChild(this);
  }
  function remove_default() {
    return this.each(remove);
  }

  // node_modules/d3-selection/src/selection/clone.js
  function selection_cloneShallow() {
    var clone3 = this.cloneNode(false), parent = this.parentNode;
    return parent ? parent.insertBefore(clone3, this.nextSibling) : clone3;
  }
  function selection_cloneDeep() {
    var clone3 = this.cloneNode(true), parent = this.parentNode;
    return parent ? parent.insertBefore(clone3, this.nextSibling) : clone3;
  }
  function clone_default(deep) {
    return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
  }

  // node_modules/d3-selection/src/selection/datum.js
  function datum_default(value) {
    return arguments.length ? this.property("__data__", value) : this.node().__data__;
  }

  // node_modules/d3-selection/src/selection/on.js
  function contextListener(listener) {
    return function(event) {
      listener.call(this, event, this.__data__);
    };
  }
  function parseTypenames2(typenames) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name2 = "", i = t.indexOf(".");
      if (i >= 0)
        name2 = t.slice(i + 1), t = t.slice(0, i);
      return { type: t, name: name2 };
    });
  }
  function onRemove(typename) {
    return function() {
      var on = this.__on;
      if (!on)
        return;
      for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
        if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.options);
        } else {
          on[++i] = o;
        }
      }
      if (++i)
        on.length = i;
      else
        delete this.__on;
    };
  }
  function onAdd(typename, value, options) {
    return function() {
      var on = this.__on, o, listener = contextListener(value);
      if (on)
        for (var j = 0, m = on.length; j < m; ++j) {
          if ((o = on[j]).type === typename.type && o.name === typename.name) {
            this.removeEventListener(o.type, o.listener, o.options);
            this.addEventListener(o.type, o.listener = listener, o.options = options);
            o.value = value;
            return;
          }
        }
      this.addEventListener(typename.type, listener, options);
      o = { type: typename.type, name: typename.name, value, listener, options };
      if (!on)
        this.__on = [o];
      else
        on.push(o);
    };
  }
  function on_default(typename, value, options) {
    var typenames = parseTypenames2(typename + ""), i, n = typenames.length, t;
    if (arguments.length < 2) {
      var on = this.node().__on;
      if (on)
        for (var j = 0, m = on.length, o; j < m; ++j) {
          for (i = 0, o = on[j]; i < n; ++i) {
            if ((t = typenames[i]).type === o.type && t.name === o.name) {
              return o.value;
            }
          }
        }
      return;
    }
    on = value ? onAdd : onRemove;
    for (i = 0; i < n; ++i)
      this.each(on(typenames[i], value, options));
    return this;
  }

  // node_modules/d3-selection/src/selection/dispatch.js
  function dispatchEvent(node, type2, params) {
    var window2 = window_default(node), event = window2.CustomEvent;
    if (typeof event === "function") {
      event = new event(type2, params);
    } else {
      event = window2.document.createEvent("Event");
      if (params)
        event.initEvent(type2, params.bubbles, params.cancelable), event.detail = params.detail;
      else
        event.initEvent(type2, false, false);
    }
    node.dispatchEvent(event);
  }
  function dispatchConstant(type2, params) {
    return function() {
      return dispatchEvent(this, type2, params);
    };
  }
  function dispatchFunction(type2, params) {
    return function() {
      return dispatchEvent(this, type2, params.apply(this, arguments));
    };
  }
  function dispatch_default2(type2, params) {
    return this.each((typeof params === "function" ? dispatchFunction : dispatchConstant)(type2, params));
  }

  // node_modules/d3-selection/src/selection/iterator.js
  function* iterator_default() {
    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i])
          yield node;
      }
    }
  }

  // node_modules/d3-selection/src/selection/index.js
  var root = [null];
  function Selection(groups, parents) {
    this._groups = groups;
    this._parents = parents;
  }
  function selection() {
    return new Selection([[document.documentElement]], root);
  }
  function selection_selection() {
    return this;
  }
  Selection.prototype = selection.prototype = {
    constructor: Selection,
    select: select_default,
    selectAll: selectAll_default,
    selectChild: selectChild_default,
    selectChildren: selectChildren_default,
    filter: filter_default,
    data: data_default,
    enter: enter_default,
    exit: exit_default,
    join: join_default,
    merge: merge_default,
    selection: selection_selection,
    order: order_default,
    sort: sort_default,
    call: call_default,
    nodes: nodes_default,
    node: node_default,
    size: size_default,
    empty: empty_default,
    each: each_default,
    attr: attr_default,
    style: style_default,
    property: property_default,
    classed: classed_default,
    text: text_default,
    html: html_default,
    raise: raise_default,
    lower: lower_default,
    append: append_default,
    insert: insert_default,
    remove: remove_default,
    clone: clone_default,
    datum: datum_default,
    on: on_default,
    dispatch: dispatch_default2,
    [Symbol.iterator]: iterator_default
  };
  var selection_default = selection;

  // node_modules/d3-selection/src/select.js
  function select_default2(selector) {
    return typeof selector === "string" ? new Selection([[document.querySelector(selector)]], [document.documentElement]) : new Selection([[selector]], root);
  }

  // node_modules/d3-color/src/define.js
  function define_default(constructor, factory, prototype) {
    constructor.prototype = factory.prototype = prototype;
    prototype.constructor = constructor;
  }
  function extend(parent, definition) {
    var prototype = Object.create(parent.prototype);
    for (var key in definition)
      prototype[key] = definition[key];
    return prototype;
  }

  // node_modules/d3-color/src/color.js
  function Color() {
  }
  var darker = 0.7;
  var brighter = 1 / darker;
  var reI = "\\s*([+-]?\\d+)\\s*";
  var reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*";
  var reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*";
  var reHex = /^#([0-9a-f]{3,8})$/;
  var reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`);
  var reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`);
  var reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`);
  var reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`);
  var reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`);
  var reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);
  var named = {
    aliceblue: 15792383,
    antiquewhite: 16444375,
    aqua: 65535,
    aquamarine: 8388564,
    azure: 15794175,
    beige: 16119260,
    bisque: 16770244,
    black: 0,
    blanchedalmond: 16772045,
    blue: 255,
    blueviolet: 9055202,
    brown: 10824234,
    burlywood: 14596231,
    cadetblue: 6266528,
    chartreuse: 8388352,
    chocolate: 13789470,
    coral: 16744272,
    cornflowerblue: 6591981,
    cornsilk: 16775388,
    crimson: 14423100,
    cyan: 65535,
    darkblue: 139,
    darkcyan: 35723,
    darkgoldenrod: 12092939,
    darkgray: 11119017,
    darkgreen: 25600,
    darkgrey: 11119017,
    darkkhaki: 12433259,
    darkmagenta: 9109643,
    darkolivegreen: 5597999,
    darkorange: 16747520,
    darkorchid: 10040012,
    darkred: 9109504,
    darksalmon: 15308410,
    darkseagreen: 9419919,
    darkslateblue: 4734347,
    darkslategray: 3100495,
    darkslategrey: 3100495,
    darkturquoise: 52945,
    darkviolet: 9699539,
    deeppink: 16716947,
    deepskyblue: 49151,
    dimgray: 6908265,
    dimgrey: 6908265,
    dodgerblue: 2003199,
    firebrick: 11674146,
    floralwhite: 16775920,
    forestgreen: 2263842,
    fuchsia: 16711935,
    gainsboro: 14474460,
    ghostwhite: 16316671,
    gold: 16766720,
    goldenrod: 14329120,
    gray: 8421504,
    green: 32768,
    greenyellow: 11403055,
    grey: 8421504,
    honeydew: 15794160,
    hotpink: 16738740,
    indianred: 13458524,
    indigo: 4915330,
    ivory: 16777200,
    khaki: 15787660,
    lavender: 15132410,
    lavenderblush: 16773365,
    lawngreen: 8190976,
    lemonchiffon: 16775885,
    lightblue: 11393254,
    lightcoral: 15761536,
    lightcyan: 14745599,
    lightgoldenrodyellow: 16448210,
    lightgray: 13882323,
    lightgreen: 9498256,
    lightgrey: 13882323,
    lightpink: 16758465,
    lightsalmon: 16752762,
    lightseagreen: 2142890,
    lightskyblue: 8900346,
    lightslategray: 7833753,
    lightslategrey: 7833753,
    lightsteelblue: 11584734,
    lightyellow: 16777184,
    lime: 65280,
    limegreen: 3329330,
    linen: 16445670,
    magenta: 16711935,
    maroon: 8388608,
    mediumaquamarine: 6737322,
    mediumblue: 205,
    mediumorchid: 12211667,
    mediumpurple: 9662683,
    mediumseagreen: 3978097,
    mediumslateblue: 8087790,
    mediumspringgreen: 64154,
    mediumturquoise: 4772300,
    mediumvioletred: 13047173,
    midnightblue: 1644912,
    mintcream: 16121850,
    mistyrose: 16770273,
    moccasin: 16770229,
    navajowhite: 16768685,
    navy: 128,
    oldlace: 16643558,
    olive: 8421376,
    olivedrab: 7048739,
    orange: 16753920,
    orangered: 16729344,
    orchid: 14315734,
    palegoldenrod: 15657130,
    palegreen: 10025880,
    paleturquoise: 11529966,
    palevioletred: 14381203,
    papayawhip: 16773077,
    peachpuff: 16767673,
    peru: 13468991,
    pink: 16761035,
    plum: 14524637,
    powderblue: 11591910,
    purple: 8388736,
    rebeccapurple: 6697881,
    red: 16711680,
    rosybrown: 12357519,
    royalblue: 4286945,
    saddlebrown: 9127187,
    salmon: 16416882,
    sandybrown: 16032864,
    seagreen: 3050327,
    seashell: 16774638,
    sienna: 10506797,
    silver: 12632256,
    skyblue: 8900331,
    slateblue: 6970061,
    slategray: 7372944,
    slategrey: 7372944,
    snow: 16775930,
    springgreen: 65407,
    steelblue: 4620980,
    tan: 13808780,
    teal: 32896,
    thistle: 14204888,
    tomato: 16737095,
    turquoise: 4251856,
    violet: 15631086,
    wheat: 16113331,
    white: 16777215,
    whitesmoke: 16119285,
    yellow: 16776960,
    yellowgreen: 10145074
  };
  define_default(Color, color, {
    copy(channels) {
      return Object.assign(new this.constructor(), this, channels);
    },
    displayable() {
      return this.rgb().displayable();
    },
    hex: color_formatHex,
    // Deprecated! Use color.formatHex.
    formatHex: color_formatHex,
    formatHex8: color_formatHex8,
    formatHsl: color_formatHsl,
    formatRgb: color_formatRgb,
    toString: color_formatRgb
  });
  function color_formatHex() {
    return this.rgb().formatHex();
  }
  function color_formatHex8() {
    return this.rgb().formatHex8();
  }
  function color_formatHsl() {
    return hslConvert(this).formatHsl();
  }
  function color_formatRgb() {
    return this.rgb().formatRgb();
  }
  function color(format2) {
    var m, l;
    format2 = (format2 + "").trim().toLowerCase();
    return (m = reHex.exec(format2)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) : l === 3 ? new Rgb(m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, (m & 15) << 4 | m & 15, 1) : l === 8 ? rgba(m >> 24 & 255, m >> 16 & 255, m >> 8 & 255, (m & 255) / 255) : l === 4 ? rgba(m >> 12 & 15 | m >> 8 & 240, m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, ((m & 15) << 4 | m & 15) / 255) : null) : (m = reRgbInteger.exec(format2)) ? new Rgb(m[1], m[2], m[3], 1) : (m = reRgbPercent.exec(format2)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) : (m = reRgbaInteger.exec(format2)) ? rgba(m[1], m[2], m[3], m[4]) : (m = reRgbaPercent.exec(format2)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) : (m = reHslPercent.exec(format2)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) : (m = reHslaPercent.exec(format2)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) : named.hasOwnProperty(format2) ? rgbn(named[format2]) : format2 === "transparent" ? new Rgb(NaN, NaN, NaN, 0) : null;
  }
  function rgbn(n) {
    return new Rgb(n >> 16 & 255, n >> 8 & 255, n & 255, 1);
  }
  function rgba(r, g, b, a) {
    if (a <= 0)
      r = g = b = NaN;
    return new Rgb(r, g, b, a);
  }
  function rgbConvert(o) {
    if (!(o instanceof Color))
      o = color(o);
    if (!o)
      return new Rgb();
    o = o.rgb();
    return new Rgb(o.r, o.g, o.b, o.opacity);
  }
  function rgb(r, g, b, opacity) {
    return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
  }
  function Rgb(r, g, b, opacity) {
    this.r = +r;
    this.g = +g;
    this.b = +b;
    this.opacity = +opacity;
  }
  define_default(Rgb, rgb, extend(Color, {
    brighter(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    darker(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    rgb() {
      return this;
    },
    clamp() {
      return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
    },
    displayable() {
      return -0.5 <= this.r && this.r < 255.5 && (-0.5 <= this.g && this.g < 255.5) && (-0.5 <= this.b && this.b < 255.5) && (0 <= this.opacity && this.opacity <= 1);
    },
    hex: rgb_formatHex,
    // Deprecated! Use color.formatHex.
    formatHex: rgb_formatHex,
    formatHex8: rgb_formatHex8,
    formatRgb: rgb_formatRgb,
    toString: rgb_formatRgb
  }));
  function rgb_formatHex() {
    return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
  }
  function rgb_formatHex8() {
    return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
  }
  function rgb_formatRgb() {
    const a = clampa(this.opacity);
    return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
  }
  function clampa(opacity) {
    return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
  }
  function clampi(value) {
    return Math.max(0, Math.min(255, Math.round(value) || 0));
  }
  function hex(value) {
    value = clampi(value);
    return (value < 16 ? "0" : "") + value.toString(16);
  }
  function hsla(h, s, l, a) {
    if (a <= 0)
      h = s = l = NaN;
    else if (l <= 0 || l >= 1)
      h = s = NaN;
    else if (s <= 0)
      h = NaN;
    return new Hsl(h, s, l, a);
  }
  function hslConvert(o) {
    if (o instanceof Hsl)
      return new Hsl(o.h, o.s, o.l, o.opacity);
    if (!(o instanceof Color))
      o = color(o);
    if (!o)
      return new Hsl();
    if (o instanceof Hsl)
      return o;
    o = o.rgb();
    var r = o.r / 255, g = o.g / 255, b = o.b / 255, min2 = Math.min(r, g, b), max2 = Math.max(r, g, b), h = NaN, s = max2 - min2, l = (max2 + min2) / 2;
    if (s) {
      if (r === max2)
        h = (g - b) / s + (g < b) * 6;
      else if (g === max2)
        h = (b - r) / s + 2;
      else
        h = (r - g) / s + 4;
      s /= l < 0.5 ? max2 + min2 : 2 - max2 - min2;
      h *= 60;
    } else {
      s = l > 0 && l < 1 ? 0 : h;
    }
    return new Hsl(h, s, l, o.opacity);
  }
  function hsl(h, s, l, opacity) {
    return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
  }
  function Hsl(h, s, l, opacity) {
    this.h = +h;
    this.s = +s;
    this.l = +l;
    this.opacity = +opacity;
  }
  define_default(Hsl, hsl, extend(Color, {
    brighter(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    darker(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    rgb() {
      var h = this.h % 360 + (this.h < 0) * 360, s = isNaN(h) || isNaN(this.s) ? 0 : this.s, l = this.l, m2 = l + (l < 0.5 ? l : 1 - l) * s, m1 = 2 * l - m2;
      return new Rgb(
        hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
        hsl2rgb(h, m1, m2),
        hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
        this.opacity
      );
    },
    clamp() {
      return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
    },
    displayable() {
      return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && (0 <= this.l && this.l <= 1) && (0 <= this.opacity && this.opacity <= 1);
    },
    formatHsl() {
      const a = clampa(this.opacity);
      return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
    }
  }));
  function clamph(value) {
    value = (value || 0) % 360;
    return value < 0 ? value + 360 : value;
  }
  function clampt(value) {
    return Math.max(0, Math.min(1, value || 0));
  }
  function hsl2rgb(h, m1, m2) {
    return (h < 60 ? m1 + (m2 - m1) * h / 60 : h < 180 ? m2 : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60 : m1) * 255;
  }

  // node_modules/d3-interpolate/src/basis.js
  function basis(t1, v0, v1, v2, v3) {
    var t2 = t1 * t1, t3 = t2 * t1;
    return ((1 - 3 * t1 + 3 * t2 - t3) * v0 + (4 - 6 * t2 + 3 * t3) * v1 + (1 + 3 * t1 + 3 * t2 - 3 * t3) * v2 + t3 * v3) / 6;
  }
  function basis_default(values) {
    var n = values.length - 1;
    return function(t) {
      var i = t <= 0 ? t = 0 : t >= 1 ? (t = 1, n - 1) : Math.floor(t * n), v1 = values[i], v2 = values[i + 1], v0 = i > 0 ? values[i - 1] : 2 * v1 - v2, v3 = i < n - 1 ? values[i + 2] : 2 * v2 - v1;
      return basis((t - i / n) * n, v0, v1, v2, v3);
    };
  }

  // node_modules/d3-interpolate/src/basisClosed.js
  function basisClosed_default(values) {
    var n = values.length;
    return function(t) {
      var i = Math.floor(((t %= 1) < 0 ? ++t : t) * n), v0 = values[(i + n - 1) % n], v1 = values[i % n], v2 = values[(i + 1) % n], v3 = values[(i + 2) % n];
      return basis((t - i / n) * n, v0, v1, v2, v3);
    };
  }

  // node_modules/d3-interpolate/src/constant.js
  var constant_default2 = (x) => () => x;

  // node_modules/d3-interpolate/src/color.js
  function linear(a, d) {
    return function(t) {
      return a + t * d;
    };
  }
  function exponential(a, b, y) {
    return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
      return Math.pow(a + t * b, y);
    };
  }
  function gamma(y) {
    return (y = +y) === 1 ? nogamma : function(a, b) {
      return b - a ? exponential(a, b, y) : constant_default2(isNaN(a) ? b : a);
    };
  }
  function nogamma(a, b) {
    var d = b - a;
    return d ? linear(a, d) : constant_default2(isNaN(a) ? b : a);
  }

  // node_modules/d3-interpolate/src/rgb.js
  var rgb_default = function rgbGamma(y) {
    var color3 = gamma(y);
    function rgb2(start2, end) {
      var r = color3((start2 = rgb(start2)).r, (end = rgb(end)).r), g = color3(start2.g, end.g), b = color3(start2.b, end.b), opacity = nogamma(start2.opacity, end.opacity);
      return function(t) {
        start2.r = r(t);
        start2.g = g(t);
        start2.b = b(t);
        start2.opacity = opacity(t);
        return start2 + "";
      };
    }
    rgb2.gamma = rgbGamma;
    return rgb2;
  }(1);
  function rgbSpline(spline) {
    return function(colors2) {
      var n = colors2.length, r = new Array(n), g = new Array(n), b = new Array(n), i, color3;
      for (i = 0; i < n; ++i) {
        color3 = rgb(colors2[i]);
        r[i] = color3.r || 0;
        g[i] = color3.g || 0;
        b[i] = color3.b || 0;
      }
      r = spline(r);
      g = spline(g);
      b = spline(b);
      color3.opacity = 1;
      return function(t) {
        color3.r = r(t);
        color3.g = g(t);
        color3.b = b(t);
        return color3 + "";
      };
    };
  }
  var rgbBasis = rgbSpline(basis_default);
  var rgbBasisClosed = rgbSpline(basisClosed_default);

  // node_modules/d3-interpolate/src/numberArray.js
  function numberArray_default(a, b) {
    if (!b)
      b = [];
    var n = a ? Math.min(b.length, a.length) : 0, c = b.slice(), i;
    return function(t) {
      for (i = 0; i < n; ++i)
        c[i] = a[i] * (1 - t) + b[i] * t;
      return c;
    };
  }
  function isNumberArray(x) {
    return ArrayBuffer.isView(x) && !(x instanceof DataView);
  }

  // node_modules/d3-interpolate/src/array.js
  function genericArray(a, b) {
    var nb = b ? b.length : 0, na = a ? Math.min(nb, a.length) : 0, x = new Array(na), c = new Array(nb), i;
    for (i = 0; i < na; ++i)
      x[i] = value_default(a[i], b[i]);
    for (; i < nb; ++i)
      c[i] = b[i];
    return function(t) {
      for (i = 0; i < na; ++i)
        c[i] = x[i](t);
      return c;
    };
  }

  // node_modules/d3-interpolate/src/date.js
  function date_default(a, b) {
    var d = /* @__PURE__ */ new Date();
    return a = +a, b = +b, function(t) {
      return d.setTime(a * (1 - t) + b * t), d;
    };
  }

  // node_modules/d3-interpolate/src/number.js
  function number_default(a, b) {
    return a = +a, b = +b, function(t) {
      return a * (1 - t) + b * t;
    };
  }

  // node_modules/d3-interpolate/src/object.js
  function object_default(a, b) {
    var i = {}, c = {}, k;
    if (a === null || typeof a !== "object")
      a = {};
    if (b === null || typeof b !== "object")
      b = {};
    for (k in b) {
      if (k in a) {
        i[k] = value_default(a[k], b[k]);
      } else {
        c[k] = b[k];
      }
    }
    return function(t) {
      for (k in i)
        c[k] = i[k](t);
      return c;
    };
  }

  // node_modules/d3-interpolate/src/string.js
  var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
  var reB = new RegExp(reA.source, "g");
  function zero2(b) {
    return function() {
      return b;
    };
  }
  function one(b) {
    return function(t) {
      return b(t) + "";
    };
  }
  function string_default(a, b) {
    var bi = reA.lastIndex = reB.lastIndex = 0, am, bm, bs, i = -1, s = [], q = [];
    a = a + "", b = b + "";
    while ((am = reA.exec(a)) && (bm = reB.exec(b))) {
      if ((bs = bm.index) > bi) {
        bs = b.slice(bi, bs);
        if (s[i])
          s[i] += bs;
        else
          s[++i] = bs;
      }
      if ((am = am[0]) === (bm = bm[0])) {
        if (s[i])
          s[i] += bm;
        else
          s[++i] = bm;
      } else {
        s[++i] = null;
        q.push({ i, x: number_default(am, bm) });
      }
      bi = reB.lastIndex;
    }
    if (bi < b.length) {
      bs = b.slice(bi);
      if (s[i])
        s[i] += bs;
      else
        s[++i] = bs;
    }
    return s.length < 2 ? q[0] ? one(q[0].x) : zero2(b) : (b = q.length, function(t) {
      for (var i2 = 0, o; i2 < b; ++i2)
        s[(o = q[i2]).i] = o.x(t);
      return s.join("");
    });
  }

  // node_modules/d3-interpolate/src/value.js
  function value_default(a, b) {
    var t = typeof b, c;
    return b == null || t === "boolean" ? constant_default2(b) : (t === "number" ? number_default : t === "string" ? (c = color(b)) ? (b = c, rgb_default) : string_default : b instanceof color ? rgb_default : b instanceof Date ? date_default : isNumberArray(b) ? numberArray_default : Array.isArray(b) ? genericArray : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object_default : number_default)(a, b);
  }

  // node_modules/d3-interpolate/src/round.js
  function round_default(a, b) {
    return a = +a, b = +b, function(t) {
      return Math.round(a * (1 - t) + b * t);
    };
  }

  // node_modules/d3-interpolate/src/transform/decompose.js
  var degrees = 180 / Math.PI;
  var identity = {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    skewX: 0,
    scaleX: 1,
    scaleY: 1
  };
  function decompose_default(a, b, c, d, e, f) {
    var scaleX, scaleY, skewX;
    if (scaleX = Math.sqrt(a * a + b * b))
      a /= scaleX, b /= scaleX;
    if (skewX = a * c + b * d)
      c -= a * skewX, d -= b * skewX;
    if (scaleY = Math.sqrt(c * c + d * d))
      c /= scaleY, d /= scaleY, skewX /= scaleY;
    if (a * d < b * c)
      a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
    return {
      translateX: e,
      translateY: f,
      rotate: Math.atan2(b, a) * degrees,
      skewX: Math.atan(skewX) * degrees,
      scaleX,
      scaleY
    };
  }

  // node_modules/d3-interpolate/src/transform/parse.js
  var svgNode;
  function parseCss(value) {
    const m = new (typeof DOMMatrix === "function" ? DOMMatrix : WebKitCSSMatrix)(value + "");
    return m.isIdentity ? identity : decompose_default(m.a, m.b, m.c, m.d, m.e, m.f);
  }
  function parseSvg(value) {
    if (value == null)
      return identity;
    if (!svgNode)
      svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svgNode.setAttribute("transform", value);
    if (!(value = svgNode.transform.baseVal.consolidate()))
      return identity;
    value = value.matrix;
    return decompose_default(value.a, value.b, value.c, value.d, value.e, value.f);
  }

  // node_modules/d3-interpolate/src/transform/index.js
  function interpolateTransform(parse2, pxComma, pxParen, degParen) {
    function pop(s) {
      return s.length ? s.pop() + " " : "";
    }
    function translate(xa, ya, xb, yb, s, q) {
      if (xa !== xb || ya !== yb) {
        var i = s.push("translate(", null, pxComma, null, pxParen);
        q.push({ i: i - 4, x: number_default(xa, xb) }, { i: i - 2, x: number_default(ya, yb) });
      } else if (xb || yb) {
        s.push("translate(" + xb + pxComma + yb + pxParen);
      }
    }
    function rotate2(a, b, s, q) {
      if (a !== b) {
        if (a - b > 180)
          b += 360;
        else if (b - a > 180)
          a += 360;
        q.push({ i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: number_default(a, b) });
      } else if (b) {
        s.push(pop(s) + "rotate(" + b + degParen);
      }
    }
    function skewX(a, b, s, q) {
      if (a !== b) {
        q.push({ i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: number_default(a, b) });
      } else if (b) {
        s.push(pop(s) + "skewX(" + b + degParen);
      }
    }
    function scale(xa, ya, xb, yb, s, q) {
      if (xa !== xb || ya !== yb) {
        var i = s.push(pop(s) + "scale(", null, ",", null, ")");
        q.push({ i: i - 4, x: number_default(xa, xb) }, { i: i - 2, x: number_default(ya, yb) });
      } else if (xb !== 1 || yb !== 1) {
        s.push(pop(s) + "scale(" + xb + "," + yb + ")");
      }
    }
    return function(a, b) {
      var s = [], q = [];
      a = parse2(a), b = parse2(b);
      translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
      rotate2(a.rotate, b.rotate, s, q);
      skewX(a.skewX, b.skewX, s, q);
      scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
      a = b = null;
      return function(t) {
        var i = -1, n = q.length, o;
        while (++i < n)
          s[(o = q[i]).i] = o.x(t);
        return s.join("");
      };
    };
  }
  var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
  var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

  // node_modules/d3-timer/src/timer.js
  var frame = 0;
  var timeout = 0;
  var interval = 0;
  var pokeDelay = 1e3;
  var taskHead;
  var taskTail;
  var clockLast = 0;
  var clockNow = 0;
  var clockSkew = 0;
  var clock = typeof performance === "object" && performance.now ? performance : Date;
  var setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) {
    setTimeout(f, 17);
  };
  function now() {
    return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
  }
  function clearNow() {
    clockNow = 0;
  }
  function Timer() {
    this._call = this._time = this._next = null;
  }
  Timer.prototype = timer.prototype = {
    constructor: Timer,
    restart: function(callback2, delay, time) {
      if (typeof callback2 !== "function")
        throw new TypeError("callback is not a function");
      time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
      if (!this._next && taskTail !== this) {
        if (taskTail)
          taskTail._next = this;
        else
          taskHead = this;
        taskTail = this;
      }
      this._call = callback2;
      this._time = time;
      sleep();
    },
    stop: function() {
      if (this._call) {
        this._call = null;
        this._time = Infinity;
        sleep();
      }
    }
  };
  function timer(callback2, delay, time) {
    var t = new Timer();
    t.restart(callback2, delay, time);
    return t;
  }
  function timerFlush() {
    now();
    ++frame;
    var t = taskHead, e;
    while (t) {
      if ((e = clockNow - t._time) >= 0)
        t._call.call(void 0, e);
      t = t._next;
    }
    --frame;
  }
  function wake() {
    clockNow = (clockLast = clock.now()) + clockSkew;
    frame = timeout = 0;
    try {
      timerFlush();
    } finally {
      frame = 0;
      nap();
      clockNow = 0;
    }
  }
  function poke() {
    var now2 = clock.now(), delay = now2 - clockLast;
    if (delay > pokeDelay)
      clockSkew -= delay, clockLast = now2;
  }
  function nap() {
    var t0, t1 = taskHead, t2, time = Infinity;
    while (t1) {
      if (t1._call) {
        if (time > t1._time)
          time = t1._time;
        t0 = t1, t1 = t1._next;
      } else {
        t2 = t1._next, t1._next = null;
        t1 = t0 ? t0._next = t2 : taskHead = t2;
      }
    }
    taskTail = t0;
    sleep(time);
  }
  function sleep(time) {
    if (frame)
      return;
    if (timeout)
      timeout = clearTimeout(timeout);
    var delay = time - clockNow;
    if (delay > 24) {
      if (time < Infinity)
        timeout = setTimeout(wake, time - clock.now() - clockSkew);
      if (interval)
        interval = clearInterval(interval);
    } else {
      if (!interval)
        clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
      frame = 1, setFrame(wake);
    }
  }

  // node_modules/d3-timer/src/timeout.js
  function timeout_default(callback2, delay, time) {
    var t = new Timer();
    delay = delay == null ? 0 : +delay;
    t.restart((elapsed) => {
      t.stop();
      callback2(elapsed + delay);
    }, delay, time);
    return t;
  }

  // node_modules/d3-transition/src/transition/schedule.js
  var emptyOn = dispatch_default("start", "end", "cancel", "interrupt");
  var emptyTween = [];
  var CREATED = 0;
  var SCHEDULED = 1;
  var STARTING = 2;
  var STARTED = 3;
  var RUNNING = 4;
  var ENDING = 5;
  var ENDED = 6;
  function schedule_default(node, name2, id2, index2, group, timing) {
    var schedules = node.__transition;
    if (!schedules)
      node.__transition = {};
    else if (id2 in schedules)
      return;
    create(node, id2, {
      name: name2,
      index: index2,
      // For context during callback.
      group,
      // For context during callback.
      on: emptyOn,
      tween: emptyTween,
      time: timing.time,
      delay: timing.delay,
      duration: timing.duration,
      ease: timing.ease,
      timer: null,
      state: CREATED
    });
  }
  function init(node, id2) {
    var schedule = get2(node, id2);
    if (schedule.state > CREATED)
      throw new Error("too late; already scheduled");
    return schedule;
  }
  function set2(node, id2) {
    var schedule = get2(node, id2);
    if (schedule.state > STARTED)
      throw new Error("too late; already running");
    return schedule;
  }
  function get2(node, id2) {
    var schedule = node.__transition;
    if (!schedule || !(schedule = schedule[id2]))
      throw new Error("transition not found");
    return schedule;
  }
  function create(node, id2, self) {
    var schedules = node.__transition, tween;
    schedules[id2] = self;
    self.timer = timer(schedule, 0, self.time);
    function schedule(elapsed) {
      self.state = SCHEDULED;
      self.timer.restart(start2, self.delay, self.time);
      if (self.delay <= elapsed)
        start2(elapsed - self.delay);
    }
    function start2(elapsed) {
      var i, j, n, o;
      if (self.state !== SCHEDULED)
        return stop();
      for (i in schedules) {
        o = schedules[i];
        if (o.name !== self.name)
          continue;
        if (o.state === STARTED)
          return timeout_default(start2);
        if (o.state === RUNNING) {
          o.state = ENDED;
          o.timer.stop();
          o.on.call("interrupt", node, node.__data__, o.index, o.group);
          delete schedules[i];
        } else if (+i < id2) {
          o.state = ENDED;
          o.timer.stop();
          o.on.call("cancel", node, node.__data__, o.index, o.group);
          delete schedules[i];
        }
      }
      timeout_default(function() {
        if (self.state === STARTED) {
          self.state = RUNNING;
          self.timer.restart(tick, self.delay, self.time);
          tick(elapsed);
        }
      });
      self.state = STARTING;
      self.on.call("start", node, node.__data__, self.index, self.group);
      if (self.state !== STARTING)
        return;
      self.state = STARTED;
      tween = new Array(n = self.tween.length);
      for (i = 0, j = -1; i < n; ++i) {
        if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
          tween[++j] = o;
        }
      }
      tween.length = j + 1;
    }
    function tick(elapsed) {
      var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1), i = -1, n = tween.length;
      while (++i < n) {
        tween[i].call(node, t);
      }
      if (self.state === ENDING) {
        self.on.call("end", node, node.__data__, self.index, self.group);
        stop();
      }
    }
    function stop() {
      self.state = ENDED;
      self.timer.stop();
      delete schedules[id2];
      for (var i in schedules)
        return;
      delete node.__transition;
    }
  }

  // node_modules/d3-transition/src/interrupt.js
  function interrupt_default(node, name2) {
    var schedules = node.__transition, schedule, active, empty2 = true, i;
    if (!schedules)
      return;
    name2 = name2 == null ? null : name2 + "";
    for (i in schedules) {
      if ((schedule = schedules[i]).name !== name2) {
        empty2 = false;
        continue;
      }
      active = schedule.state > STARTING && schedule.state < ENDING;
      schedule.state = ENDED;
      schedule.timer.stop();
      schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
      delete schedules[i];
    }
    if (empty2)
      delete node.__transition;
  }

  // node_modules/d3-transition/src/selection/interrupt.js
  function interrupt_default2(name2) {
    return this.each(function() {
      interrupt_default(this, name2);
    });
  }

  // node_modules/d3-transition/src/transition/tween.js
  function tweenRemove(id2, name2) {
    var tween0, tween1;
    return function() {
      var schedule = set2(this, id2), tween = schedule.tween;
      if (tween !== tween0) {
        tween1 = tween0 = tween;
        for (var i = 0, n = tween1.length; i < n; ++i) {
          if (tween1[i].name === name2) {
            tween1 = tween1.slice();
            tween1.splice(i, 1);
            break;
          }
        }
      }
      schedule.tween = tween1;
    };
  }
  function tweenFunction(id2, name2, value) {
    var tween0, tween1;
    if (typeof value !== "function")
      throw new Error();
    return function() {
      var schedule = set2(this, id2), tween = schedule.tween;
      if (tween !== tween0) {
        tween1 = (tween0 = tween).slice();
        for (var t = { name: name2, value }, i = 0, n = tween1.length; i < n; ++i) {
          if (tween1[i].name === name2) {
            tween1[i] = t;
            break;
          }
        }
        if (i === n)
          tween1.push(t);
      }
      schedule.tween = tween1;
    };
  }
  function tween_default(name2, value) {
    var id2 = this._id;
    name2 += "";
    if (arguments.length < 2) {
      var tween = get2(this.node(), id2).tween;
      for (var i = 0, n = tween.length, t; i < n; ++i) {
        if ((t = tween[i]).name === name2) {
          return t.value;
        }
      }
      return null;
    }
    return this.each((value == null ? tweenRemove : tweenFunction)(id2, name2, value));
  }
  function tweenValue(transition2, name2, value) {
    var id2 = transition2._id;
    transition2.each(function() {
      var schedule = set2(this, id2);
      (schedule.value || (schedule.value = {}))[name2] = value.apply(this, arguments);
    });
    return function(node) {
      return get2(node, id2).value[name2];
    };
  }

  // node_modules/d3-transition/src/transition/interpolate.js
  function interpolate_default(a, b) {
    var c;
    return (typeof b === "number" ? number_default : b instanceof color ? rgb_default : (c = color(b)) ? (b = c, rgb_default) : string_default)(a, b);
  }

  // node_modules/d3-transition/src/transition/attr.js
  function attrRemove2(name2) {
    return function() {
      this.removeAttribute(name2);
    };
  }
  function attrRemoveNS2(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }
  function attrConstant2(name2, interpolate3, value1) {
    var string00, string1 = value1 + "", interpolate0;
    return function() {
      var string0 = this.getAttribute(name2);
      return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate3(string00 = string0, value1);
    };
  }
  function attrConstantNS2(fullname, interpolate3, value1) {
    var string00, string1 = value1 + "", interpolate0;
    return function() {
      var string0 = this.getAttributeNS(fullname.space, fullname.local);
      return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate3(string00 = string0, value1);
    };
  }
  function attrFunction2(name2, interpolate3, value) {
    var string00, string10, interpolate0;
    return function() {
      var string0, value1 = value(this), string1;
      if (value1 == null)
        return void this.removeAttribute(name2);
      string0 = this.getAttribute(name2);
      string1 = value1 + "";
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate3(string00 = string0, value1));
    };
  }
  function attrFunctionNS2(fullname, interpolate3, value) {
    var string00, string10, interpolate0;
    return function() {
      var string0, value1 = value(this), string1;
      if (value1 == null)
        return void this.removeAttributeNS(fullname.space, fullname.local);
      string0 = this.getAttributeNS(fullname.space, fullname.local);
      string1 = value1 + "";
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate3(string00 = string0, value1));
    };
  }
  function attr_default2(name2, value) {
    var fullname = namespace_default(name2), i = fullname === "transform" ? interpolateTransformSvg : interpolate_default;
    return this.attrTween(name2, typeof value === "function" ? (fullname.local ? attrFunctionNS2 : attrFunction2)(fullname, i, tweenValue(this, "attr." + name2, value)) : value == null ? (fullname.local ? attrRemoveNS2 : attrRemove2)(fullname) : (fullname.local ? attrConstantNS2 : attrConstant2)(fullname, i, value));
  }

  // node_modules/d3-transition/src/transition/attrTween.js
  function attrInterpolate(name2, i) {
    return function(t) {
      this.setAttribute(name2, i.call(this, t));
    };
  }
  function attrInterpolateNS(fullname, i) {
    return function(t) {
      this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
    };
  }
  function attrTweenNS(fullname, value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0)
        t0 = (i0 = i) && attrInterpolateNS(fullname, i);
      return t0;
    }
    tween._value = value;
    return tween;
  }
  function attrTween(name2, value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0)
        t0 = (i0 = i) && attrInterpolate(name2, i);
      return t0;
    }
    tween._value = value;
    return tween;
  }
  function attrTween_default(name2, value) {
    var key = "attr." + name2;
    if (arguments.length < 2)
      return (key = this.tween(key)) && key._value;
    if (value == null)
      return this.tween(key, null);
    if (typeof value !== "function")
      throw new Error();
    var fullname = namespace_default(name2);
    return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
  }

  // node_modules/d3-transition/src/transition/delay.js
  function delayFunction(id2, value) {
    return function() {
      init(this, id2).delay = +value.apply(this, arguments);
    };
  }
  function delayConstant(id2, value) {
    return value = +value, function() {
      init(this, id2).delay = value;
    };
  }
  function delay_default(value) {
    var id2 = this._id;
    return arguments.length ? this.each((typeof value === "function" ? delayFunction : delayConstant)(id2, value)) : get2(this.node(), id2).delay;
  }

  // node_modules/d3-transition/src/transition/duration.js
  function durationFunction(id2, value) {
    return function() {
      set2(this, id2).duration = +value.apply(this, arguments);
    };
  }
  function durationConstant(id2, value) {
    return value = +value, function() {
      set2(this, id2).duration = value;
    };
  }
  function duration_default(value) {
    var id2 = this._id;
    return arguments.length ? this.each((typeof value === "function" ? durationFunction : durationConstant)(id2, value)) : get2(this.node(), id2).duration;
  }

  // node_modules/d3-transition/src/transition/ease.js
  function easeConstant(id2, value) {
    if (typeof value !== "function")
      throw new Error();
    return function() {
      set2(this, id2).ease = value;
    };
  }
  function ease_default(value) {
    var id2 = this._id;
    return arguments.length ? this.each(easeConstant(id2, value)) : get2(this.node(), id2).ease;
  }

  // node_modules/d3-transition/src/transition/easeVarying.js
  function easeVarying(id2, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (typeof v !== "function")
        throw new Error();
      set2(this, id2).ease = v;
    };
  }
  function easeVarying_default(value) {
    if (typeof value !== "function")
      throw new Error();
    return this.each(easeVarying(this._id, value));
  }

  // node_modules/d3-transition/src/transition/filter.js
  function filter_default2(match) {
    if (typeof match !== "function")
      match = matcher_default(match);
    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }
    return new Transition(subgroups, this._parents, this._name, this._id);
  }

  // node_modules/d3-transition/src/transition/merge.js
  function merge_default2(transition2) {
    if (transition2._id !== this._id)
      throw new Error();
    for (var groups0 = this._groups, groups1 = transition2._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge2 = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge2[i] = node;
        }
      }
    }
    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }
    return new Transition(merges, this._parents, this._name, this._id);
  }

  // node_modules/d3-transition/src/transition/on.js
  function start(name2) {
    return (name2 + "").trim().split(/^|\s+/).every(function(t) {
      var i = t.indexOf(".");
      if (i >= 0)
        t = t.slice(0, i);
      return !t || t === "start";
    });
  }
  function onFunction(id2, name2, listener) {
    var on0, on1, sit = start(name2) ? init : set2;
    return function() {
      var schedule = sit(this, id2), on = schedule.on;
      if (on !== on0)
        (on1 = (on0 = on).copy()).on(name2, listener);
      schedule.on = on1;
    };
  }
  function on_default2(name2, listener) {
    var id2 = this._id;
    return arguments.length < 2 ? get2(this.node(), id2).on.on(name2) : this.each(onFunction(id2, name2, listener));
  }

  // node_modules/d3-transition/src/transition/remove.js
  function removeFunction(id2) {
    return function() {
      var parent = this.parentNode;
      for (var i in this.__transition)
        if (+i !== id2)
          return;
      if (parent)
        parent.removeChild(this);
    };
  }
  function remove_default2() {
    return this.on("end.remove", removeFunction(this._id));
  }

  // node_modules/d3-transition/src/transition/select.js
  function select_default3(select) {
    var name2 = this._name, id2 = this._id;
    if (typeof select !== "function")
      select = selector_default(select);
    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node)
            subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
          schedule_default(subgroup[i], name2, id2, i, subgroup, get2(node, id2));
        }
      }
    }
    return new Transition(subgroups, this._parents, name2, id2);
  }

  // node_modules/d3-transition/src/transition/selectAll.js
  function selectAll_default2(select) {
    var name2 = this._name, id2 = this._id;
    if (typeof select !== "function")
      select = selectorAll_default(select);
    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          for (var children2 = select.call(node, node.__data__, i, group), child, inherit2 = get2(node, id2), k = 0, l = children2.length; k < l; ++k) {
            if (child = children2[k]) {
              schedule_default(child, name2, id2, k, children2, inherit2);
            }
          }
          subgroups.push(children2);
          parents.push(node);
        }
      }
    }
    return new Transition(subgroups, parents, name2, id2);
  }

  // node_modules/d3-transition/src/transition/selection.js
  var Selection2 = selection_default.prototype.constructor;
  function selection_default2() {
    return new Selection2(this._groups, this._parents);
  }

  // node_modules/d3-transition/src/transition/style.js
  function styleNull(name2, interpolate3) {
    var string00, string10, interpolate0;
    return function() {
      var string0 = styleValue(this, name2), string1 = (this.style.removeProperty(name2), styleValue(this, name2));
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : interpolate0 = interpolate3(string00 = string0, string10 = string1);
    };
  }
  function styleRemove2(name2) {
    return function() {
      this.style.removeProperty(name2);
    };
  }
  function styleConstant2(name2, interpolate3, value1) {
    var string00, string1 = value1 + "", interpolate0;
    return function() {
      var string0 = styleValue(this, name2);
      return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate3(string00 = string0, value1);
    };
  }
  function styleFunction2(name2, interpolate3, value) {
    var string00, string10, interpolate0;
    return function() {
      var string0 = styleValue(this, name2), value1 = value(this), string1 = value1 + "";
      if (value1 == null)
        string1 = value1 = (this.style.removeProperty(name2), styleValue(this, name2));
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate3(string00 = string0, value1));
    };
  }
  function styleMaybeRemove(id2, name2) {
    var on0, on1, listener0, key = "style." + name2, event = "end." + key, remove2;
    return function() {
      var schedule = set2(this, id2), on = schedule.on, listener = schedule.value[key] == null ? remove2 || (remove2 = styleRemove2(name2)) : void 0;
      if (on !== on0 || listener0 !== listener)
        (on1 = (on0 = on).copy()).on(event, listener0 = listener);
      schedule.on = on1;
    };
  }
  function style_default2(name2, value, priority) {
    var i = (name2 += "") === "transform" ? interpolateTransformCss : interpolate_default;
    return value == null ? this.styleTween(name2, styleNull(name2, i)).on("end.style." + name2, styleRemove2(name2)) : typeof value === "function" ? this.styleTween(name2, styleFunction2(name2, i, tweenValue(this, "style." + name2, value))).each(styleMaybeRemove(this._id, name2)) : this.styleTween(name2, styleConstant2(name2, i, value), priority).on("end.style." + name2, null);
  }

  // node_modules/d3-transition/src/transition/styleTween.js
  function styleInterpolate(name2, i, priority) {
    return function(t) {
      this.style.setProperty(name2, i.call(this, t), priority);
    };
  }
  function styleTween(name2, value, priority) {
    var t, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0)
        t = (i0 = i) && styleInterpolate(name2, i, priority);
      return t;
    }
    tween._value = value;
    return tween;
  }
  function styleTween_default(name2, value, priority) {
    var key = "style." + (name2 += "");
    if (arguments.length < 2)
      return (key = this.tween(key)) && key._value;
    if (value == null)
      return this.tween(key, null);
    if (typeof value !== "function")
      throw new Error();
    return this.tween(key, styleTween(name2, value, priority == null ? "" : priority));
  }

  // node_modules/d3-transition/src/transition/text.js
  function textConstant2(value) {
    return function() {
      this.textContent = value;
    };
  }
  function textFunction2(value) {
    return function() {
      var value1 = value(this);
      this.textContent = value1 == null ? "" : value1;
    };
  }
  function text_default2(value) {
    return this.tween("text", typeof value === "function" ? textFunction2(tweenValue(this, "text", value)) : textConstant2(value == null ? "" : value + ""));
  }

  // node_modules/d3-transition/src/transition/textTween.js
  function textInterpolate(i) {
    return function(t) {
      this.textContent = i.call(this, t);
    };
  }
  function textTween(value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0)
        t0 = (i0 = i) && textInterpolate(i);
      return t0;
    }
    tween._value = value;
    return tween;
  }
  function textTween_default(value) {
    var key = "text";
    if (arguments.length < 1)
      return (key = this.tween(key)) && key._value;
    if (value == null)
      return this.tween(key, null);
    if (typeof value !== "function")
      throw new Error();
    return this.tween(key, textTween(value));
  }

  // node_modules/d3-transition/src/transition/transition.js
  function transition_default() {
    var name2 = this._name, id0 = this._id, id1 = newId();
    for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          var inherit2 = get2(node, id0);
          schedule_default(node, name2, id1, i, group, {
            time: inherit2.time + inherit2.delay + inherit2.duration,
            delay: 0,
            duration: inherit2.duration,
            ease: inherit2.ease
          });
        }
      }
    }
    return new Transition(groups, this._parents, name2, id1);
  }

  // node_modules/d3-transition/src/transition/end.js
  function end_default() {
    var on0, on1, that = this, id2 = that._id, size = that.size();
    return new Promise(function(resolve2, reject) {
      var cancel = { value: reject }, end = { value: function() {
        if (--size === 0)
          resolve2();
      } };
      that.each(function() {
        var schedule = set2(this, id2), on = schedule.on;
        if (on !== on0) {
          on1 = (on0 = on).copy();
          on1._.cancel.push(cancel);
          on1._.interrupt.push(cancel);
          on1._.end.push(end);
        }
        schedule.on = on1;
      });
      if (size === 0)
        resolve2();
    });
  }

  // node_modules/d3-transition/src/transition/index.js
  var id = 0;
  function Transition(groups, parents, name2, id2) {
    this._groups = groups;
    this._parents = parents;
    this._name = name2;
    this._id = id2;
  }
  function transition(name2) {
    return selection_default().transition(name2);
  }
  function newId() {
    return ++id;
  }
  var selection_prototype = selection_default.prototype;
  Transition.prototype = transition.prototype = {
    constructor: Transition,
    select: select_default3,
    selectAll: selectAll_default2,
    selectChild: selection_prototype.selectChild,
    selectChildren: selection_prototype.selectChildren,
    filter: filter_default2,
    merge: merge_default2,
    selection: selection_default2,
    transition: transition_default,
    call: selection_prototype.call,
    nodes: selection_prototype.nodes,
    node: selection_prototype.node,
    size: selection_prototype.size,
    empty: selection_prototype.empty,
    each: selection_prototype.each,
    on: on_default2,
    attr: attr_default2,
    attrTween: attrTween_default,
    style: style_default2,
    styleTween: styleTween_default,
    text: text_default2,
    textTween: textTween_default,
    remove: remove_default2,
    tween: tween_default,
    delay: delay_default,
    duration: duration_default,
    ease: ease_default,
    easeVarying: easeVarying_default,
    end: end_default,
    [Symbol.iterator]: selection_prototype[Symbol.iterator]
  };

  // node_modules/d3-ease/src/cubic.js
  function cubicInOut(t) {
    return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
  }

  // node_modules/d3-transition/src/selection/transition.js
  var defaultTiming = {
    time: null,
    // Set on use.
    delay: 0,
    duration: 250,
    ease: cubicInOut
  };
  function inherit(node, id2) {
    var timing;
    while (!(timing = node.__transition) || !(timing = timing[id2])) {
      if (!(node = node.parentNode)) {
        throw new Error(`transition ${id2} not found`);
      }
    }
    return timing;
  }
  function transition_default2(name2) {
    var id2, timing;
    if (name2 instanceof Transition) {
      id2 = name2._id, name2 = name2._name;
    } else {
      id2 = newId(), (timing = defaultTiming).time = now(), name2 = name2 == null ? null : name2 + "";
    }
    for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          schedule_default(node, name2, id2, i, group, timing || inherit(node, id2));
        }
      }
    }
    return new Transition(groups, this._parents, name2, id2);
  }

  // node_modules/d3-transition/src/selection/index.js
  selection_default.prototype.interrupt = interrupt_default2;
  selection_default.prototype.transition = transition_default2;

  // node_modules/d3-brush/src/brush.js
  var { abs, max, min } = Math;
  function number1(e) {
    return [+e[0], +e[1]];
  }
  function number2(e) {
    return [number1(e[0]), number1(e[1])];
  }
  var X = {
    name: "x",
    handles: ["w", "e"].map(type),
    input: function(x, e) {
      return x == null ? null : [[+x[0], e[0][1]], [+x[1], e[1][1]]];
    },
    output: function(xy) {
      return xy && [xy[0][0], xy[1][0]];
    }
  };
  var Y = {
    name: "y",
    handles: ["n", "s"].map(type),
    input: function(y, e) {
      return y == null ? null : [[e[0][0], +y[0]], [e[1][0], +y[1]]];
    },
    output: function(xy) {
      return xy && [xy[0][1], xy[1][1]];
    }
  };
  var XY = {
    name: "xy",
    handles: ["n", "w", "e", "s", "nw", "ne", "sw", "se"].map(type),
    input: function(xy) {
      return xy == null ? null : number2(xy);
    },
    output: function(xy) {
      return xy;
    }
  };
  function type(t) {
    return { type: t };
  }

  // node_modules/d3-format/src/formatDecimal.js
  function formatDecimal_default(x) {
    return Math.abs(x = Math.round(x)) >= 1e21 ? x.toLocaleString("en").replace(/,/g, "") : x.toString(10);
  }
  function formatDecimalParts(x, p) {
    if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0)
      return null;
    var i, coefficient = x.slice(0, i);
    return [
      coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
      +x.slice(i + 1)
    ];
  }

  // node_modules/d3-format/src/exponent.js
  function exponent_default(x) {
    return x = formatDecimalParts(Math.abs(x)), x ? x[1] : NaN;
  }

  // node_modules/d3-format/src/formatGroup.js
  function formatGroup_default(grouping, thousands) {
    return function(value, width) {
      var i = value.length, t = [], j = 0, g = grouping[0], length = 0;
      while (i > 0 && g > 0) {
        if (length + g + 1 > width)
          g = Math.max(1, width - length);
        t.push(value.substring(i -= g, i + g));
        if ((length += g + 1) > width)
          break;
        g = grouping[j = (j + 1) % grouping.length];
      }
      return t.reverse().join(thousands);
    };
  }

  // node_modules/d3-format/src/formatNumerals.js
  function formatNumerals_default(numerals) {
    return function(value) {
      return value.replace(/[0-9]/g, function(i) {
        return numerals[+i];
      });
    };
  }

  // node_modules/d3-format/src/formatSpecifier.js
  var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;
  function formatSpecifier(specifier) {
    if (!(match = re.exec(specifier)))
      throw new Error("invalid format: " + specifier);
    var match;
    return new FormatSpecifier({
      fill: match[1],
      align: match[2],
      sign: match[3],
      symbol: match[4],
      zero: match[5],
      width: match[6],
      comma: match[7],
      precision: match[8] && match[8].slice(1),
      trim: match[9],
      type: match[10]
    });
  }
  formatSpecifier.prototype = FormatSpecifier.prototype;
  function FormatSpecifier(specifier) {
    this.fill = specifier.fill === void 0 ? " " : specifier.fill + "";
    this.align = specifier.align === void 0 ? ">" : specifier.align + "";
    this.sign = specifier.sign === void 0 ? "-" : specifier.sign + "";
    this.symbol = specifier.symbol === void 0 ? "" : specifier.symbol + "";
    this.zero = !!specifier.zero;
    this.width = specifier.width === void 0 ? void 0 : +specifier.width;
    this.comma = !!specifier.comma;
    this.precision = specifier.precision === void 0 ? void 0 : +specifier.precision;
    this.trim = !!specifier.trim;
    this.type = specifier.type === void 0 ? "" : specifier.type + "";
  }
  FormatSpecifier.prototype.toString = function() {
    return this.fill + this.align + this.sign + this.symbol + (this.zero ? "0" : "") + (this.width === void 0 ? "" : Math.max(1, this.width | 0)) + (this.comma ? "," : "") + (this.precision === void 0 ? "" : "." + Math.max(0, this.precision | 0)) + (this.trim ? "~" : "") + this.type;
  };

  // node_modules/d3-format/src/formatTrim.js
  function formatTrim_default(s) {
    out:
      for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
        switch (s[i]) {
          case ".":
            i0 = i1 = i;
            break;
          case "0":
            if (i0 === 0)
              i0 = i;
            i1 = i;
            break;
          default:
            if (!+s[i])
              break out;
            if (i0 > 0)
              i0 = 0;
            break;
        }
      }
    return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
  }

  // node_modules/d3-format/src/formatPrefixAuto.js
  var prefixExponent;
  function formatPrefixAuto_default(x, p) {
    var d = formatDecimalParts(x, p);
    if (!d)
      return x + "";
    var coefficient = d[0], exponent = d[1], i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1, n = coefficient.length;
    return i === n ? coefficient : i > n ? coefficient + new Array(i - n + 1).join("0") : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i) : "0." + new Array(1 - i).join("0") + formatDecimalParts(x, Math.max(0, p + i - 1))[0];
  }

  // node_modules/d3-format/src/formatRounded.js
  function formatRounded_default(x, p) {
    var d = formatDecimalParts(x, p);
    if (!d)
      return x + "";
    var coefficient = d[0], exponent = d[1];
    return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1) : coefficient + new Array(exponent - coefficient.length + 2).join("0");
  }

  // node_modules/d3-format/src/formatTypes.js
  var formatTypes_default = {
    "%": (x, p) => (x * 100).toFixed(p),
    "b": (x) => Math.round(x).toString(2),
    "c": (x) => x + "",
    "d": formatDecimal_default,
    "e": (x, p) => x.toExponential(p),
    "f": (x, p) => x.toFixed(p),
    "g": (x, p) => x.toPrecision(p),
    "o": (x) => Math.round(x).toString(8),
    "p": (x, p) => formatRounded_default(x * 100, p),
    "r": formatRounded_default,
    "s": formatPrefixAuto_default,
    "X": (x) => Math.round(x).toString(16).toUpperCase(),
    "x": (x) => Math.round(x).toString(16)
  };

  // node_modules/d3-format/src/identity.js
  function identity_default(x) {
    return x;
  }

  // node_modules/d3-format/src/locale.js
  var map = Array.prototype.map;
  var prefixes = ["y", "z", "a", "f", "p", "n", "\xB5", "m", "", "k", "M", "G", "T", "P", "E", "Z", "Y"];
  function locale_default(locale2) {
    var group = locale2.grouping === void 0 || locale2.thousands === void 0 ? identity_default : formatGroup_default(map.call(locale2.grouping, Number), locale2.thousands + ""), currencyPrefix = locale2.currency === void 0 ? "" : locale2.currency[0] + "", currencySuffix = locale2.currency === void 0 ? "" : locale2.currency[1] + "", decimal = locale2.decimal === void 0 ? "." : locale2.decimal + "", numerals = locale2.numerals === void 0 ? identity_default : formatNumerals_default(map.call(locale2.numerals, String)), percent = locale2.percent === void 0 ? "%" : locale2.percent + "", minus = locale2.minus === void 0 ? "\u2212" : locale2.minus + "", nan = locale2.nan === void 0 ? "NaN" : locale2.nan + "";
    function newFormat(specifier) {
      specifier = formatSpecifier(specifier);
      var fill2 = specifier.fill, align = specifier.align, sign2 = specifier.sign, symbol = specifier.symbol, zero3 = specifier.zero, width = specifier.width, comma = specifier.comma, precision = specifier.precision, trim = specifier.trim, type2 = specifier.type;
      if (type2 === "n")
        comma = true, type2 = "g";
      else if (!formatTypes_default[type2])
        precision === void 0 && (precision = 12), trim = true, type2 = "g";
      if (zero3 || fill2 === "0" && align === "=")
        zero3 = true, fill2 = "0", align = "=";
      var prefix = symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type2) ? "0" + type2.toLowerCase() : "", suffix = symbol === "$" ? currencySuffix : /[%p]/.test(type2) ? percent : "";
      var formatType = formatTypes_default[type2], maybeSuffix = /[defgprs%]/.test(type2);
      precision = precision === void 0 ? 6 : /[gprs]/.test(type2) ? Math.max(1, Math.min(21, precision)) : Math.max(0, Math.min(20, precision));
      function format2(value) {
        var valuePrefix = prefix, valueSuffix = suffix, i, n, c;
        if (type2 === "c") {
          valueSuffix = formatType(value) + valueSuffix;
          value = "";
        } else {
          value = +value;
          var valueNegative = value < 0 || 1 / value < 0;
          value = isNaN(value) ? nan : formatType(Math.abs(value), precision);
          if (trim)
            value = formatTrim_default(value);
          if (valueNegative && +value === 0 && sign2 !== "+")
            valueNegative = false;
          valuePrefix = (valueNegative ? sign2 === "(" ? sign2 : minus : sign2 === "-" || sign2 === "(" ? "" : sign2) + valuePrefix;
          valueSuffix = (type2 === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign2 === "(" ? ")" : "");
          if (maybeSuffix) {
            i = -1, n = value.length;
            while (++i < n) {
              if (c = value.charCodeAt(i), 48 > c || c > 57) {
                valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
                value = value.slice(0, i);
                break;
              }
            }
          }
        }
        if (comma && !zero3)
          value = group(value, Infinity);
        var length = valuePrefix.length + value.length + valueSuffix.length, padding = length < width ? new Array(width - length + 1).join(fill2) : "";
        if (comma && zero3)
          value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";
        switch (align) {
          case "<":
            value = valuePrefix + value + valueSuffix + padding;
            break;
          case "=":
            value = valuePrefix + padding + value + valueSuffix;
            break;
          case "^":
            value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length);
            break;
          default:
            value = padding + valuePrefix + value + valueSuffix;
            break;
        }
        return numerals(value);
      }
      format2.toString = function() {
        return specifier + "";
      };
      return format2;
    }
    function formatPrefix2(specifier, value) {
      var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)), e = Math.max(-8, Math.min(8, Math.floor(exponent_default(value) / 3))) * 3, k = Math.pow(10, -e), prefix = prefixes[8 + e / 3];
      return function(value2) {
        return f(k * value2) + prefix;
      };
    }
    return {
      format: newFormat,
      formatPrefix: formatPrefix2
    };
  }

  // node_modules/d3-format/src/defaultLocale.js
  var locale;
  var format;
  var formatPrefix;
  defaultLocale({
    thousands: ",",
    grouping: [3],
    currency: ["$", ""]
  });
  function defaultLocale(definition) {
    locale = locale_default(definition);
    format = locale.format;
    formatPrefix = locale.formatPrefix;
    return locale;
  }

  // node_modules/d3-format/src/precisionFixed.js
  function precisionFixed_default(step) {
    return Math.max(0, -exponent_default(Math.abs(step)));
  }

  // node_modules/d3-format/src/precisionPrefix.js
  function precisionPrefix_default(step, value) {
    return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent_default(value) / 3))) * 3 - exponent_default(Math.abs(step)));
  }

  // node_modules/d3-format/src/precisionRound.js
  function precisionRound_default(step, max2) {
    step = Math.abs(step), max2 = Math.abs(max2) - step;
    return Math.max(0, exponent_default(max2) - exponent_default(step)) + 1;
  }

  // node_modules/d3-scale/src/init.js
  function initRange(domain, range) {
    switch (arguments.length) {
      case 0:
        break;
      case 1:
        this.range(domain);
        break;
      default:
        this.range(range).domain(domain);
        break;
    }
    return this;
  }

  // node_modules/d3-scale/src/constant.js
  function constants(x) {
    return function() {
      return x;
    };
  }

  // node_modules/d3-scale/src/number.js
  function number3(x) {
    return +x;
  }

  // node_modules/d3-scale/src/continuous.js
  var unit = [0, 1];
  function identity2(x) {
    return x;
  }
  function normalize(a, b) {
    return (b -= a = +a) ? function(x) {
      return (x - a) / b;
    } : constants(isNaN(b) ? NaN : 0.5);
  }
  function clamper(a, b) {
    var t;
    if (a > b)
      t = a, a = b, b = t;
    return function(x) {
      return Math.max(a, Math.min(b, x));
    };
  }
  function bimap(domain, range, interpolate3) {
    var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
    if (d1 < d0)
      d0 = normalize(d1, d0), r0 = interpolate3(r1, r0);
    else
      d0 = normalize(d0, d1), r0 = interpolate3(r0, r1);
    return function(x) {
      return r0(d0(x));
    };
  }
  function polymap(domain, range, interpolate3) {
    var j = Math.min(domain.length, range.length) - 1, d = new Array(j), r = new Array(j), i = -1;
    if (domain[j] < domain[0]) {
      domain = domain.slice().reverse();
      range = range.slice().reverse();
    }
    while (++i < j) {
      d[i] = normalize(domain[i], domain[i + 1]);
      r[i] = interpolate3(range[i], range[i + 1]);
    }
    return function(x) {
      var i2 = bisect_default(domain, x, 1, j) - 1;
      return r[i2](d[i2](x));
    };
  }
  function copy(source, target) {
    return target.domain(source.domain()).range(source.range()).interpolate(source.interpolate()).clamp(source.clamp()).unknown(source.unknown());
  }
  function transformer() {
    var domain = unit, range = unit, interpolate3 = value_default, transform2, untransform, unknown, clamp = identity2, piecewise, output, input;
    function rescale() {
      var n = Math.min(domain.length, range.length);
      if (clamp !== identity2)
        clamp = clamper(domain[0], domain[n - 1]);
      piecewise = n > 2 ? polymap : bimap;
      output = input = null;
      return scale;
    }
    function scale(x) {
      return x == null || isNaN(x = +x) ? unknown : (output || (output = piecewise(domain.map(transform2), range, interpolate3)))(transform2(clamp(x)));
    }
    scale.invert = function(y) {
      return clamp(untransform((input || (input = piecewise(range, domain.map(transform2), number_default)))(y)));
    };
    scale.domain = function(_) {
      return arguments.length ? (domain = Array.from(_, number3), rescale()) : domain.slice();
    };
    scale.range = function(_) {
      return arguments.length ? (range = Array.from(_), rescale()) : range.slice();
    };
    scale.rangeRound = function(_) {
      return range = Array.from(_), interpolate3 = round_default, rescale();
    };
    scale.clamp = function(_) {
      return arguments.length ? (clamp = _ ? true : identity2, rescale()) : clamp !== identity2;
    };
    scale.interpolate = function(_) {
      return arguments.length ? (interpolate3 = _, rescale()) : interpolate3;
    };
    scale.unknown = function(_) {
      return arguments.length ? (unknown = _, scale) : unknown;
    };
    return function(t, u) {
      transform2 = t, untransform = u;
      return rescale();
    };
  }
  function continuous() {
    return transformer()(identity2, identity2);
  }

  // node_modules/d3-scale/src/tickFormat.js
  function tickFormat(start2, stop, count, specifier) {
    var step = tickStep(start2, stop, count), precision;
    specifier = formatSpecifier(specifier == null ? ",f" : specifier);
    switch (specifier.type) {
      case "s": {
        var value = Math.max(Math.abs(start2), Math.abs(stop));
        if (specifier.precision == null && !isNaN(precision = precisionPrefix_default(step, value)))
          specifier.precision = precision;
        return formatPrefix(specifier, value);
      }
      case "":
      case "e":
      case "g":
      case "p":
      case "r": {
        if (specifier.precision == null && !isNaN(precision = precisionRound_default(step, Math.max(Math.abs(start2), Math.abs(stop)))))
          specifier.precision = precision - (specifier.type === "e");
        break;
      }
      case "f":
      case "%": {
        if (specifier.precision == null && !isNaN(precision = precisionFixed_default(step)))
          specifier.precision = precision - (specifier.type === "%") * 2;
        break;
      }
    }
    return format(specifier);
  }

  // node_modules/d3-scale/src/linear.js
  function linearish(scale) {
    var domain = scale.domain;
    scale.ticks = function(count) {
      var d = domain();
      return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
    };
    scale.tickFormat = function(count, specifier) {
      var d = domain();
      return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
    };
    scale.nice = function(count) {
      if (count == null)
        count = 10;
      var d = domain();
      var i0 = 0;
      var i1 = d.length - 1;
      var start2 = d[i0];
      var stop = d[i1];
      var prestep;
      var step;
      var maxIter = 10;
      if (stop < start2) {
        step = start2, start2 = stop, stop = step;
        step = i0, i0 = i1, i1 = step;
      }
      while (maxIter-- > 0) {
        step = tickIncrement(start2, stop, count);
        if (step === prestep) {
          d[i0] = start2;
          d[i1] = stop;
          return domain(d);
        } else if (step > 0) {
          start2 = Math.floor(start2 / step) * step;
          stop = Math.ceil(stop / step) * step;
        } else if (step < 0) {
          start2 = Math.ceil(start2 * step) / step;
          stop = Math.floor(stop * step) / step;
        } else {
          break;
        }
        prestep = step;
      }
      return scale;
    };
    return scale;
  }
  function linear2() {
    var scale = continuous();
    scale.copy = function() {
      return copy(scale, linear2());
    };
    initRange.apply(scale, arguments);
    return linearish(scale);
  }

  // node_modules/d3-zoom/src/transform.js
  function Transform(k, x, y) {
    this.k = k;
    this.x = x;
    this.y = y;
  }
  Transform.prototype = {
    constructor: Transform,
    scale: function(k) {
      return k === 1 ? this : new Transform(this.k * k, this.x, this.y);
    },
    translate: function(x, y) {
      return x === 0 & y === 0 ? this : new Transform(this.k, this.x + this.k * x, this.y + this.k * y);
    },
    apply: function(point) {
      return [point[0] * this.k + this.x, point[1] * this.k + this.y];
    },
    applyX: function(x) {
      return x * this.k + this.x;
    },
    applyY: function(y) {
      return y * this.k + this.y;
    },
    invert: function(location) {
      return [(location[0] - this.x) / this.k, (location[1] - this.y) / this.k];
    },
    invertX: function(x) {
      return (x - this.x) / this.k;
    },
    invertY: function(y) {
      return (y - this.y) / this.k;
    },
    rescaleX: function(x) {
      return x.copy().domain(x.range().map(this.invertX, this).map(x.invert, x));
    },
    rescaleY: function(y) {
      return y.copy().domain(y.range().map(this.invertY, this).map(y.invert, y));
    },
    toString: function() {
      return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
    }
  };
  var identity3 = new Transform(1, 0, 0);
  transform.prototype = Transform.prototype;
  function transform(node) {
    while (!node.__zoom)
      if (!(node = node.parentNode))
        return identity3;
    return node.__zoom;
  }

  // node_modules/@kurkle/color/dist/color.esm.js
  function round(v) {
    return v + 0.5 | 0;
  }
  var lim = (v, l, h) => Math.max(Math.min(v, h), l);
  function p2b(v) {
    return lim(round(v * 2.55), 0, 255);
  }
  function n2b(v) {
    return lim(round(v * 255), 0, 255);
  }
  function b2n(v) {
    return lim(round(v / 2.55) / 100, 0, 1);
  }
  function n2p(v) {
    return lim(round(v * 100), 0, 100);
  }
  var map$1 = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, a: 10, b: 11, c: 12, d: 13, e: 14, f: 15 };
  var hex2 = [..."0123456789ABCDEF"];
  var h1 = (b) => hex2[b & 15];
  var h2 = (b) => hex2[(b & 240) >> 4] + hex2[b & 15];
  var eq = (b) => (b & 240) >> 4 === (b & 15);
  var isShort = (v) => eq(v.r) && eq(v.g) && eq(v.b) && eq(v.a);
  function hexParse(str) {
    var len = str.length;
    var ret;
    if (str[0] === "#") {
      if (len === 4 || len === 5) {
        ret = {
          r: 255 & map$1[str[1]] * 17,
          g: 255 & map$1[str[2]] * 17,
          b: 255 & map$1[str[3]] * 17,
          a: len === 5 ? map$1[str[4]] * 17 : 255
        };
      } else if (len === 7 || len === 9) {
        ret = {
          r: map$1[str[1]] << 4 | map$1[str[2]],
          g: map$1[str[3]] << 4 | map$1[str[4]],
          b: map$1[str[5]] << 4 | map$1[str[6]],
          a: len === 9 ? map$1[str[7]] << 4 | map$1[str[8]] : 255
        };
      }
    }
    return ret;
  }
  var alpha = (a, f) => a < 255 ? f(a) : "";
  function hexString(v) {
    var f = isShort(v) ? h1 : h2;
    return v ? "#" + f(v.r) + f(v.g) + f(v.b) + alpha(v.a, f) : void 0;
  }
  var HUE_RE = /^(hsla?|hwb|hsv)\(\s*([-+.e\d]+)(?:deg)?[\s,]+([-+.e\d]+)%[\s,]+([-+.e\d]+)%(?:[\s,]+([-+.e\d]+)(%)?)?\s*\)$/;
  function hsl2rgbn(h, s, l) {
    const a = s * Math.min(l, 1 - l);
    const f = (n, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return [f(0), f(8), f(4)];
  }
  function hsv2rgbn(h, s, v) {
    const f = (n, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    return [f(5), f(3), f(1)];
  }
  function hwb2rgbn(h, w, b) {
    const rgb2 = hsl2rgbn(h, 1, 0.5);
    let i;
    if (w + b > 1) {
      i = 1 / (w + b);
      w *= i;
      b *= i;
    }
    for (i = 0; i < 3; i++) {
      rgb2[i] *= 1 - w - b;
      rgb2[i] += w;
    }
    return rgb2;
  }
  function hueValue(r, g, b, d, max2) {
    if (r === max2) {
      return (g - b) / d + (g < b ? 6 : 0);
    }
    if (g === max2) {
      return (b - r) / d + 2;
    }
    return (r - g) / d + 4;
  }
  function rgb2hsl(v) {
    const range = 255;
    const r = v.r / range;
    const g = v.g / range;
    const b = v.b / range;
    const max2 = Math.max(r, g, b);
    const min2 = Math.min(r, g, b);
    const l = (max2 + min2) / 2;
    let h, s, d;
    if (max2 !== min2) {
      d = max2 - min2;
      s = l > 0.5 ? d / (2 - max2 - min2) : d / (max2 + min2);
      h = hueValue(r, g, b, d, max2);
      h = h * 60 + 0.5;
    }
    return [h | 0, s || 0, l];
  }
  function calln(f, a, b, c) {
    return (Array.isArray(a) ? f(a[0], a[1], a[2]) : f(a, b, c)).map(n2b);
  }
  function hsl2rgb2(h, s, l) {
    return calln(hsl2rgbn, h, s, l);
  }
  function hwb2rgb(h, w, b) {
    return calln(hwb2rgbn, h, w, b);
  }
  function hsv2rgb(h, s, v) {
    return calln(hsv2rgbn, h, s, v);
  }
  function hue(h) {
    return (h % 360 + 360) % 360;
  }
  function hueParse(str) {
    const m = HUE_RE.exec(str);
    let a = 255;
    let v;
    if (!m) {
      return;
    }
    if (m[5] !== v) {
      a = m[6] ? p2b(+m[5]) : n2b(+m[5]);
    }
    const h = hue(+m[2]);
    const p1 = +m[3] / 100;
    const p2 = +m[4] / 100;
    if (m[1] === "hwb") {
      v = hwb2rgb(h, p1, p2);
    } else if (m[1] === "hsv") {
      v = hsv2rgb(h, p1, p2);
    } else {
      v = hsl2rgb2(h, p1, p2);
    }
    return {
      r: v[0],
      g: v[1],
      b: v[2],
      a
    };
  }
  function rotate(v, deg) {
    var h = rgb2hsl(v);
    h[0] = hue(h[0] + deg);
    h = hsl2rgb2(h);
    v.r = h[0];
    v.g = h[1];
    v.b = h[2];
  }
  function hslString(v) {
    if (!v) {
      return;
    }
    const a = rgb2hsl(v);
    const h = a[0];
    const s = n2p(a[1]);
    const l = n2p(a[2]);
    return v.a < 255 ? `hsla(${h}, ${s}%, ${l}%, ${b2n(v.a)})` : `hsl(${h}, ${s}%, ${l}%)`;
  }
  var map2 = {
    x: "dark",
    Z: "light",
    Y: "re",
    X: "blu",
    W: "gr",
    V: "medium",
    U: "slate",
    A: "ee",
    T: "ol",
    S: "or",
    B: "ra",
    C: "lateg",
    D: "ights",
    R: "in",
    Q: "turquois",
    E: "hi",
    P: "ro",
    O: "al",
    N: "le",
    M: "de",
    L: "yello",
    F: "en",
    K: "ch",
    G: "arks",
    H: "ea",
    I: "ightg",
    J: "wh"
  };
  var names$1 = {
    OiceXe: "f0f8ff",
    antiquewEte: "faebd7",
    aqua: "ffff",
    aquamarRe: "7fffd4",
    azuY: "f0ffff",
    beige: "f5f5dc",
    bisque: "ffe4c4",
    black: "0",
    blanKedOmond: "ffebcd",
    Xe: "ff",
    XeviTet: "8a2be2",
    bPwn: "a52a2a",
    burlywood: "deb887",
    caMtXe: "5f9ea0",
    KartYuse: "7fff00",
    KocTate: "d2691e",
    cSO: "ff7f50",
    cSnflowerXe: "6495ed",
    cSnsilk: "fff8dc",
    crimson: "dc143c",
    cyan: "ffff",
    xXe: "8b",
    xcyan: "8b8b",
    xgTMnPd: "b8860b",
    xWay: "a9a9a9",
    xgYF: "6400",
    xgYy: "a9a9a9",
    xkhaki: "bdb76b",
    xmagFta: "8b008b",
    xTivegYF: "556b2f",
    xSange: "ff8c00",
    xScEd: "9932cc",
    xYd: "8b0000",
    xsOmon: "e9967a",
    xsHgYF: "8fbc8f",
    xUXe: "483d8b",
    xUWay: "2f4f4f",
    xUgYy: "2f4f4f",
    xQe: "ced1",
    xviTet: "9400d3",
    dAppRk: "ff1493",
    dApskyXe: "bfff",
    dimWay: "696969",
    dimgYy: "696969",
    dodgerXe: "1e90ff",
    fiYbrick: "b22222",
    flSOwEte: "fffaf0",
    foYstWAn: "228b22",
    fuKsia: "ff00ff",
    gaRsbSo: "dcdcdc",
    ghostwEte: "f8f8ff",
    gTd: "ffd700",
    gTMnPd: "daa520",
    Way: "808080",
    gYF: "8000",
    gYFLw: "adff2f",
    gYy: "808080",
    honeyMw: "f0fff0",
    hotpRk: "ff69b4",
    RdianYd: "cd5c5c",
    Rdigo: "4b0082",
    ivSy: "fffff0",
    khaki: "f0e68c",
    lavFMr: "e6e6fa",
    lavFMrXsh: "fff0f5",
    lawngYF: "7cfc00",
    NmoncEffon: "fffacd",
    ZXe: "add8e6",
    ZcSO: "f08080",
    Zcyan: "e0ffff",
    ZgTMnPdLw: "fafad2",
    ZWay: "d3d3d3",
    ZgYF: "90ee90",
    ZgYy: "d3d3d3",
    ZpRk: "ffb6c1",
    ZsOmon: "ffa07a",
    ZsHgYF: "20b2aa",
    ZskyXe: "87cefa",
    ZUWay: "778899",
    ZUgYy: "778899",
    ZstAlXe: "b0c4de",
    ZLw: "ffffe0",
    lime: "ff00",
    limegYF: "32cd32",
    lRF: "faf0e6",
    magFta: "ff00ff",
    maPon: "800000",
    VaquamarRe: "66cdaa",
    VXe: "cd",
    VScEd: "ba55d3",
    VpurpN: "9370db",
    VsHgYF: "3cb371",
    VUXe: "7b68ee",
    VsprRggYF: "fa9a",
    VQe: "48d1cc",
    VviTetYd: "c71585",
    midnightXe: "191970",
    mRtcYam: "f5fffa",
    mistyPse: "ffe4e1",
    moccasR: "ffe4b5",
    navajowEte: "ffdead",
    navy: "80",
    Tdlace: "fdf5e6",
    Tive: "808000",
    TivedBb: "6b8e23",
    Sange: "ffa500",
    SangeYd: "ff4500",
    ScEd: "da70d6",
    pOegTMnPd: "eee8aa",
    pOegYF: "98fb98",
    pOeQe: "afeeee",
    pOeviTetYd: "db7093",
    papayawEp: "ffefd5",
    pHKpuff: "ffdab9",
    peru: "cd853f",
    pRk: "ffc0cb",
    plum: "dda0dd",
    powMrXe: "b0e0e6",
    purpN: "800080",
    YbeccapurpN: "663399",
    Yd: "ff0000",
    Psybrown: "bc8f8f",
    PyOXe: "4169e1",
    saddNbPwn: "8b4513",
    sOmon: "fa8072",
    sandybPwn: "f4a460",
    sHgYF: "2e8b57",
    sHshell: "fff5ee",
    siFna: "a0522d",
    silver: "c0c0c0",
    skyXe: "87ceeb",
    UXe: "6a5acd",
    UWay: "708090",
    UgYy: "708090",
    snow: "fffafa",
    sprRggYF: "ff7f",
    stAlXe: "4682b4",
    tan: "d2b48c",
    teO: "8080",
    tEstN: "d8bfd8",
    tomato: "ff6347",
    Qe: "40e0d0",
    viTet: "ee82ee",
    JHt: "f5deb3",
    wEte: "ffffff",
    wEtesmoke: "f5f5f5",
    Lw: "ffff00",
    LwgYF: "9acd32"
  };
  function unpack() {
    const unpacked = {};
    const keys = Object.keys(names$1);
    const tkeys = Object.keys(map2);
    let i, j, k, ok, nk;
    for (i = 0; i < keys.length; i++) {
      ok = nk = keys[i];
      for (j = 0; j < tkeys.length; j++) {
        k = tkeys[j];
        nk = nk.replace(k, map2[k]);
      }
      k = parseInt(names$1[ok], 16);
      unpacked[nk] = [k >> 16 & 255, k >> 8 & 255, k & 255];
    }
    return unpacked;
  }
  var names;
  function nameParse(str) {
    if (!names) {
      names = unpack();
      names.transparent = [0, 0, 0, 0];
    }
    const a = names[str.toLowerCase()];
    return a && {
      r: a[0],
      g: a[1],
      b: a[2],
      a: a.length === 4 ? a[3] : 255
    };
  }
  var RGB_RE = /^rgba?\(\s*([-+.\d]+)(%)?[\s,]+([-+.e\d]+)(%)?[\s,]+([-+.e\d]+)(%)?(?:[\s,/]+([-+.e\d]+)(%)?)?\s*\)$/;
  function rgbParse(str) {
    const m = RGB_RE.exec(str);
    let a = 255;
    let r, g, b;
    if (!m) {
      return;
    }
    if (m[7] !== r) {
      const v = +m[7];
      a = m[8] ? p2b(v) : lim(v * 255, 0, 255);
    }
    r = +m[1];
    g = +m[3];
    b = +m[5];
    r = 255 & (m[2] ? p2b(r) : lim(r, 0, 255));
    g = 255 & (m[4] ? p2b(g) : lim(g, 0, 255));
    b = 255 & (m[6] ? p2b(b) : lim(b, 0, 255));
    return {
      r,
      g,
      b,
      a
    };
  }
  function rgbString(v) {
    return v && (v.a < 255 ? `rgba(${v.r}, ${v.g}, ${v.b}, ${b2n(v.a)})` : `rgb(${v.r}, ${v.g}, ${v.b})`);
  }
  var to = (v) => v <= 31308e-7 ? v * 12.92 : Math.pow(v, 1 / 2.4) * 1.055 - 0.055;
  var from = (v) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  function interpolate(rgb1, rgb2, t) {
    const r = from(b2n(rgb1.r));
    const g = from(b2n(rgb1.g));
    const b = from(b2n(rgb1.b));
    return {
      r: n2b(to(r + t * (from(b2n(rgb2.r)) - r))),
      g: n2b(to(g + t * (from(b2n(rgb2.g)) - g))),
      b: n2b(to(b + t * (from(b2n(rgb2.b)) - b))),
      a: rgb1.a + t * (rgb2.a - rgb1.a)
    };
  }
  function modHSL(v, i, ratio) {
    if (v) {
      let tmp = rgb2hsl(v);
      tmp[i] = Math.max(0, Math.min(tmp[i] + tmp[i] * ratio, i === 0 ? 360 : 1));
      tmp = hsl2rgb2(tmp);
      v.r = tmp[0];
      v.g = tmp[1];
      v.b = tmp[2];
    }
  }
  function clone(v, proto) {
    return v ? Object.assign(proto || {}, v) : v;
  }
  function fromObject(input) {
    var v = { r: 0, g: 0, b: 0, a: 255 };
    if (Array.isArray(input)) {
      if (input.length >= 3) {
        v = { r: input[0], g: input[1], b: input[2], a: 255 };
        if (input.length > 3) {
          v.a = n2b(input[3]);
        }
      }
    } else {
      v = clone(input, { r: 0, g: 0, b: 0, a: 1 });
      v.a = n2b(v.a);
    }
    return v;
  }
  function functionParse(str) {
    if (str.charAt(0) === "r") {
      return rgbParse(str);
    }
    return hueParse(str);
  }
  var Color2 = class {
    constructor(input) {
      if (input instanceof Color2) {
        return input;
      }
      const type2 = typeof input;
      let v;
      if (type2 === "object") {
        v = fromObject(input);
      } else if (type2 === "string") {
        v = hexParse(input) || nameParse(input) || functionParse(input);
      }
      this._rgb = v;
      this._valid = !!v;
    }
    get valid() {
      return this._valid;
    }
    get rgb() {
      var v = clone(this._rgb);
      if (v) {
        v.a = b2n(v.a);
      }
      return v;
    }
    set rgb(obj) {
      this._rgb = fromObject(obj);
    }
    rgbString() {
      return this._valid ? rgbString(this._rgb) : void 0;
    }
    hexString() {
      return this._valid ? hexString(this._rgb) : void 0;
    }
    hslString() {
      return this._valid ? hslString(this._rgb) : void 0;
    }
    mix(color3, weight) {
      if (color3) {
        const c1 = this.rgb;
        const c2 = color3.rgb;
        let w2;
        const p = weight === w2 ? 0.5 : weight;
        const w = 2 * p - 1;
        const a = c1.a - c2.a;
        const w1 = ((w * a === -1 ? w : (w + a) / (1 + w * a)) + 1) / 2;
        w2 = 1 - w1;
        c1.r = 255 & w1 * c1.r + w2 * c2.r + 0.5;
        c1.g = 255 & w1 * c1.g + w2 * c2.g + 0.5;
        c1.b = 255 & w1 * c1.b + w2 * c2.b + 0.5;
        c1.a = p * c1.a + (1 - p) * c2.a;
        this.rgb = c1;
      }
      return this;
    }
    interpolate(color3, t) {
      if (color3) {
        this._rgb = interpolate(this._rgb, color3._rgb, t);
      }
      return this;
    }
    clone() {
      return new Color2(this.rgb);
    }
    alpha(a) {
      this._rgb.a = n2b(a);
      return this;
    }
    clearer(ratio) {
      const rgb2 = this._rgb;
      rgb2.a *= 1 - ratio;
      return this;
    }
    greyscale() {
      const rgb2 = this._rgb;
      const val = round(rgb2.r * 0.3 + rgb2.g * 0.59 + rgb2.b * 0.11);
      rgb2.r = rgb2.g = rgb2.b = val;
      return this;
    }
    opaquer(ratio) {
      const rgb2 = this._rgb;
      rgb2.a *= 1 + ratio;
      return this;
    }
    negate() {
      const v = this._rgb;
      v.r = 255 - v.r;
      v.g = 255 - v.g;
      v.b = 255 - v.b;
      return this;
    }
    lighten(ratio) {
      modHSL(this._rgb, 2, ratio);
      return this;
    }
    darken(ratio) {
      modHSL(this._rgb, 2, -ratio);
      return this;
    }
    saturate(ratio) {
      modHSL(this._rgb, 1, ratio);
      return this;
    }
    desaturate(ratio) {
      modHSL(this._rgb, 1, -ratio);
      return this;
    }
    rotate(deg) {
      rotate(this._rgb, deg);
      return this;
    }
  };

  // node_modules/chart.js/dist/chunks/helpers.segment.js
  function noop2() {
  }
  var uid = (() => {
    let id2 = 0;
    return () => id2++;
  })();
  function isNullOrUndef(value) {
    return value === null || typeof value === "undefined";
  }
  function isArray(value) {
    if (Array.isArray && Array.isArray(value)) {
      return true;
    }
    const type2 = Object.prototype.toString.call(value);
    if (type2.slice(0, 7) === "[object" && type2.slice(-6) === "Array]") {
      return true;
    }
    return false;
  }
  function isObject(value) {
    return value !== null && Object.prototype.toString.call(value) === "[object Object]";
  }
  function isNumberFinite(value) {
    return (typeof value === "number" || value instanceof Number) && isFinite(+value);
  }
  function finiteOrDefault(value, defaultValue) {
    return isNumberFinite(value) ? value : defaultValue;
  }
  function valueOrDefault(value, defaultValue) {
    return typeof value === "undefined" ? defaultValue : value;
  }
  var toPercentage = (value, dimension) => typeof value === "string" && value.endsWith("%") ? parseFloat(value) / 100 : +value / dimension;
  var toDimension = (value, dimension) => typeof value === "string" && value.endsWith("%") ? parseFloat(value) / 100 * dimension : +value;
  function callback(fn, args, thisArg) {
    if (fn && typeof fn.call === "function") {
      return fn.apply(thisArg, args);
    }
  }
  function each(loopable, fn, thisArg, reverse) {
    let i, len, keys;
    if (isArray(loopable)) {
      len = loopable.length;
      if (reverse) {
        for (i = len - 1; i >= 0; i--) {
          fn.call(thisArg, loopable[i], i);
        }
      } else {
        for (i = 0; i < len; i++) {
          fn.call(thisArg, loopable[i], i);
        }
      }
    } else if (isObject(loopable)) {
      keys = Object.keys(loopable);
      len = keys.length;
      for (i = 0; i < len; i++) {
        fn.call(thisArg, loopable[keys[i]], keys[i]);
      }
    }
  }
  function _elementsEqual(a0, a1) {
    let i, ilen, v0, v1;
    if (!a0 || !a1 || a0.length !== a1.length) {
      return false;
    }
    for (i = 0, ilen = a0.length; i < ilen; ++i) {
      v0 = a0[i];
      v1 = a1[i];
      if (v0.datasetIndex !== v1.datasetIndex || v0.index !== v1.index) {
        return false;
      }
    }
    return true;
  }
  function clone2(source) {
    if (isArray(source)) {
      return source.map(clone2);
    }
    if (isObject(source)) {
      const target = /* @__PURE__ */ Object.create(null);
      const keys = Object.keys(source);
      const klen = keys.length;
      let k = 0;
      for (; k < klen; ++k) {
        target[keys[k]] = clone2(source[keys[k]]);
      }
      return target;
    }
    return source;
  }
  function isValidKey(key) {
    return [
      "__proto__",
      "prototype",
      "constructor"
    ].indexOf(key) === -1;
  }
  function _merger(key, target, source, options) {
    if (!isValidKey(key)) {
      return;
    }
    const tval = target[key];
    const sval = source[key];
    if (isObject(tval) && isObject(sval)) {
      merge(tval, sval, options);
    } else {
      target[key] = clone2(sval);
    }
  }
  function merge(target, source, options) {
    const sources = isArray(source) ? source : [
      source
    ];
    const ilen = sources.length;
    if (!isObject(target)) {
      return target;
    }
    options = options || {};
    const merger = options.merger || _merger;
    let current;
    for (let i = 0; i < ilen; ++i) {
      current = sources[i];
      if (!isObject(current)) {
        continue;
      }
      const keys = Object.keys(current);
      for (let k = 0, klen = keys.length; k < klen; ++k) {
        merger(keys[k], target, current, options);
      }
    }
    return target;
  }
  function mergeIf(target, source) {
    return merge(target, source, {
      merger: _mergerIf
    });
  }
  function _mergerIf(key, target, source) {
    if (!isValidKey(key)) {
      return;
    }
    const tval = target[key];
    const sval = source[key];
    if (isObject(tval) && isObject(sval)) {
      mergeIf(tval, sval);
    } else if (!Object.prototype.hasOwnProperty.call(target, key)) {
      target[key] = clone2(sval);
    }
  }
  var keyResolvers = {
    // Chart.helpers.core resolveObjectKey should resolve empty key to root object
    "": (v) => v,
    // default resolvers
    x: (o) => o.x,
    y: (o) => o.y
  };
  function _splitKey(key) {
    const parts = key.split(".");
    const keys = [];
    let tmp = "";
    for (const part of parts) {
      tmp += part;
      if (tmp.endsWith("\\")) {
        tmp = tmp.slice(0, -1) + ".";
      } else {
        keys.push(tmp);
        tmp = "";
      }
    }
    return keys;
  }
  function _getKeyResolver(key) {
    const keys = _splitKey(key);
    return (obj) => {
      for (const k of keys) {
        if (k === "") {
          break;
        }
        obj = obj && obj[k];
      }
      return obj;
    };
  }
  function resolveObjectKey(obj, key) {
    const resolver = keyResolvers[key] || (keyResolvers[key] = _getKeyResolver(key));
    return resolver(obj);
  }
  function _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  var defined = (value) => typeof value !== "undefined";
  var isFunction = (value) => typeof value === "function";
  var setsEqual = (a, b) => {
    if (a.size !== b.size) {
      return false;
    }
    for (const item of a) {
      if (!b.has(item)) {
        return false;
      }
    }
    return true;
  };
  function _isClickEvent(e) {
    return e.type === "mouseup" || e.type === "click" || e.type === "contextmenu";
  }
  var PI = Math.PI;
  var TAU = 2 * PI;
  var PITAU = TAU + PI;
  var INFINITY = Number.POSITIVE_INFINITY;
  var RAD_PER_DEG = PI / 180;
  var HALF_PI = PI / 2;
  var QUARTER_PI = PI / 4;
  var TWO_THIRDS_PI = PI * 2 / 3;
  var log10 = Math.log10;
  var sign = Math.sign;
  function almostEquals(x, y, epsilon) {
    return Math.abs(x - y) < epsilon;
  }
  function niceNum(range) {
    const roundedRange = Math.round(range);
    range = almostEquals(range, roundedRange, range / 1e3) ? roundedRange : range;
    const niceRange = Math.pow(10, Math.floor(log10(range)));
    const fraction = range / niceRange;
    const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    return niceFraction * niceRange;
  }
  function _factorize(value) {
    const result = [];
    const sqrt = Math.sqrt(value);
    let i;
    for (i = 1; i < sqrt; i++) {
      if (value % i === 0) {
        result.push(i);
        result.push(value / i);
      }
    }
    if (sqrt === (sqrt | 0)) {
      result.push(sqrt);
    }
    result.sort((a, b) => a - b).pop();
    return result;
  }
  function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }
  function almostWhole(x, epsilon) {
    const rounded = Math.round(x);
    return rounded - epsilon <= x && rounded + epsilon >= x;
  }
  function _setMinAndMaxByKey(array2, target, property) {
    let i, ilen, value;
    for (i = 0, ilen = array2.length; i < ilen; i++) {
      value = array2[i][property];
      if (!isNaN(value)) {
        target.min = Math.min(target.min, value);
        target.max = Math.max(target.max, value);
      }
    }
  }
  function toRadians(degrees2) {
    return degrees2 * (PI / 180);
  }
  function toDegrees(radians) {
    return radians * (180 / PI);
  }
  function _decimalPlaces(x) {
    if (!isNumberFinite(x)) {
      return;
    }
    let e = 1;
    let p = 0;
    while (Math.round(x * e) / e !== x) {
      e *= 10;
      p++;
    }
    return p;
  }
  function getAngleFromPoint(centrePoint, anglePoint) {
    const distanceFromXCenter = anglePoint.x - centrePoint.x;
    const distanceFromYCenter = anglePoint.y - centrePoint.y;
    const radialDistanceFromCenter = Math.sqrt(distanceFromXCenter * distanceFromXCenter + distanceFromYCenter * distanceFromYCenter);
    let angle = Math.atan2(distanceFromYCenter, distanceFromXCenter);
    if (angle < -0.5 * PI) {
      angle += TAU;
    }
    return {
      angle,
      distance: radialDistanceFromCenter
    };
  }
  function distanceBetweenPoints(pt1, pt2) {
    return Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2));
  }
  function _angleDiff(a, b) {
    return (a - b + PITAU) % TAU - PI;
  }
  function _normalizeAngle(a) {
    return (a % TAU + TAU) % TAU;
  }
  function _angleBetween(angle, start2, end, sameAngleIsFullCircle) {
    const a = _normalizeAngle(angle);
    const s = _normalizeAngle(start2);
    const e = _normalizeAngle(end);
    const angleToStart = _normalizeAngle(s - a);
    const angleToEnd = _normalizeAngle(e - a);
    const startToAngle = _normalizeAngle(a - s);
    const endToAngle = _normalizeAngle(a - e);
    return a === s || a === e || sameAngleIsFullCircle && s === e || angleToStart > angleToEnd && startToAngle < endToAngle;
  }
  function _limitValue(value, min2, max2) {
    return Math.max(min2, Math.min(max2, value));
  }
  function _int16Range(value) {
    return _limitValue(value, -32768, 32767);
  }
  function _isBetween(value, start2, end, epsilon = 1e-6) {
    return value >= Math.min(start2, end) - epsilon && value <= Math.max(start2, end) + epsilon;
  }
  function _lookup(table, value, cmp) {
    cmp = cmp || ((index2) => table[index2] < value);
    let hi = table.length - 1;
    let lo = 0;
    let mid;
    while (hi - lo > 1) {
      mid = lo + hi >> 1;
      if (cmp(mid)) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return {
      lo,
      hi
    };
  }
  var _lookupByKey = (table, key, value, last) => _lookup(table, value, last ? (index2) => {
    const ti = table[index2][key];
    return ti < value || ti === value && table[index2 + 1][key] === value;
  } : (index2) => table[index2][key] < value);
  var _rlookupByKey = (table, key, value) => _lookup(table, value, (index2) => table[index2][key] >= value);
  function _filterBetween(values, min2, max2) {
    let start2 = 0;
    let end = values.length;
    while (start2 < end && values[start2] < min2) {
      start2++;
    }
    while (end > start2 && values[end - 1] > max2) {
      end--;
    }
    return start2 > 0 || end < values.length ? values.slice(start2, end) : values;
  }
  var arrayEvents = [
    "push",
    "pop",
    "shift",
    "splice",
    "unshift"
  ];
  function listenArrayEvents(array2, listener) {
    if (array2._chartjs) {
      array2._chartjs.listeners.push(listener);
      return;
    }
    Object.defineProperty(array2, "_chartjs", {
      configurable: true,
      enumerable: false,
      value: {
        listeners: [
          listener
        ]
      }
    });
    arrayEvents.forEach((key) => {
      const method = "_onData" + _capitalize(key);
      const base = array2[key];
      Object.defineProperty(array2, key, {
        configurable: true,
        enumerable: false,
        value(...args) {
          const res = base.apply(this, args);
          array2._chartjs.listeners.forEach((object) => {
            if (typeof object[method] === "function") {
              object[method](...args);
            }
          });
          return res;
        }
      });
    });
  }
  function unlistenArrayEvents(array2, listener) {
    const stub = array2._chartjs;
    if (!stub) {
      return;
    }
    const listeners = stub.listeners;
    const index2 = listeners.indexOf(listener);
    if (index2 !== -1) {
      listeners.splice(index2, 1);
    }
    if (listeners.length > 0) {
      return;
    }
    arrayEvents.forEach((key) => {
      delete array2[key];
    });
    delete array2._chartjs;
  }
  function _arrayUnique(items) {
    const set4 = /* @__PURE__ */ new Set();
    let i, ilen;
    for (i = 0, ilen = items.length; i < ilen; ++i) {
      set4.add(items[i]);
    }
    if (set4.size === ilen) {
      return items;
    }
    return Array.from(set4);
  }
  var requestAnimFrame = function() {
    if (typeof window === "undefined") {
      return function(callback2) {
        return callback2();
      };
    }
    return window.requestAnimationFrame;
  }();
  function throttled(fn, thisArg) {
    let argsToUse = [];
    let ticking = false;
    return function(...args) {
      argsToUse = args;
      if (!ticking) {
        ticking = true;
        requestAnimFrame.call(window, () => {
          ticking = false;
          fn.apply(thisArg, argsToUse);
        });
      }
    };
  }
  function debounce(fn, delay) {
    let timeout2;
    return function(...args) {
      if (delay) {
        clearTimeout(timeout2);
        timeout2 = setTimeout(fn, delay, args);
      } else {
        fn.apply(this, args);
      }
      return delay;
    };
  }
  var _toLeftRightCenter = (align) => align === "start" ? "left" : align === "end" ? "right" : "center";
  var _alignStartEnd = (align, start2, end) => align === "start" ? start2 : align === "end" ? end : (start2 + end) / 2;
  var _textX = (align, left, right, rtl) => {
    const check = rtl ? "left" : "right";
    return align === check ? right : align === "center" ? (left + right) / 2 : left;
  };
  function _getStartAndCountOfVisiblePoints(meta, points, animationsDisabled) {
    const pointCount = points.length;
    let start2 = 0;
    let count = pointCount;
    if (meta._sorted) {
      const { iScale, _parsed } = meta;
      const axis = iScale.axis;
      const { min: min2, max: max2, minDefined, maxDefined } = iScale.getUserBounds();
      if (minDefined) {
        start2 = _limitValue(Math.min(
          // @ts-expect-error Need to type _parsed
          _lookupByKey(_parsed, iScale.axis, min2).lo,
          // @ts-expect-error Need to fix types on _lookupByKey
          animationsDisabled ? pointCount : _lookupByKey(points, axis, iScale.getPixelForValue(min2)).lo
        ), 0, pointCount - 1);
      }
      if (maxDefined) {
        count = _limitValue(Math.max(
          // @ts-expect-error Need to type _parsed
          _lookupByKey(_parsed, iScale.axis, max2, true).hi + 1,
          // @ts-expect-error Need to fix types on _lookupByKey
          animationsDisabled ? 0 : _lookupByKey(points, axis, iScale.getPixelForValue(max2), true).hi + 1
        ), start2, pointCount) - start2;
      } else {
        count = pointCount - start2;
      }
    }
    return {
      start: start2,
      count
    };
  }
  function _scaleRangesChanged(meta) {
    const { xScale, yScale, _scaleRanges } = meta;
    const newRanges = {
      xmin: xScale.min,
      xmax: xScale.max,
      ymin: yScale.min,
      ymax: yScale.max
    };
    if (!_scaleRanges) {
      meta._scaleRanges = newRanges;
      return true;
    }
    const changed = _scaleRanges.xmin !== xScale.min || _scaleRanges.xmax !== xScale.max || _scaleRanges.ymin !== yScale.min || _scaleRanges.ymax !== yScale.max;
    Object.assign(_scaleRanges, newRanges);
    return changed;
  }
  var atEdge = (t) => t === 0 || t === 1;
  var elasticIn = (t, s, p) => -(Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * TAU / p));
  var elasticOut = (t, s, p) => Math.pow(2, -10 * t) * Math.sin((t - s) * TAU / p) + 1;
  var effects = {
    linear: (t) => t,
    easeInQuad: (t) => t * t,
    easeOutQuad: (t) => -t * (t - 2),
    easeInOutQuad: (t) => (t /= 0.5) < 1 ? 0.5 * t * t : -0.5 * (--t * (t - 2) - 1),
    easeInCubic: (t) => t * t * t,
    easeOutCubic: (t) => (t -= 1) * t * t + 1,
    easeInOutCubic: (t) => (t /= 0.5) < 1 ? 0.5 * t * t * t : 0.5 * ((t -= 2) * t * t + 2),
    easeInQuart: (t) => t * t * t * t,
    easeOutQuart: (t) => -((t -= 1) * t * t * t - 1),
    easeInOutQuart: (t) => (t /= 0.5) < 1 ? 0.5 * t * t * t * t : -0.5 * ((t -= 2) * t * t * t - 2),
    easeInQuint: (t) => t * t * t * t * t,
    easeOutQuint: (t) => (t -= 1) * t * t * t * t + 1,
    easeInOutQuint: (t) => (t /= 0.5) < 1 ? 0.5 * t * t * t * t * t : 0.5 * ((t -= 2) * t * t * t * t + 2),
    easeInSine: (t) => -Math.cos(t * HALF_PI) + 1,
    easeOutSine: (t) => Math.sin(t * HALF_PI),
    easeInOutSine: (t) => -0.5 * (Math.cos(PI * t) - 1),
    easeInExpo: (t) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
    easeOutExpo: (t) => t === 1 ? 1 : -Math.pow(2, -10 * t) + 1,
    easeInOutExpo: (t) => atEdge(t) ? t : t < 0.5 ? 0.5 * Math.pow(2, 10 * (t * 2 - 1)) : 0.5 * (-Math.pow(2, -10 * (t * 2 - 1)) + 2),
    easeInCirc: (t) => t >= 1 ? t : -(Math.sqrt(1 - t * t) - 1),
    easeOutCirc: (t) => Math.sqrt(1 - (t -= 1) * t),
    easeInOutCirc: (t) => (t /= 0.5) < 1 ? -0.5 * (Math.sqrt(1 - t * t) - 1) : 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1),
    easeInElastic: (t) => atEdge(t) ? t : elasticIn(t, 0.075, 0.3),
    easeOutElastic: (t) => atEdge(t) ? t : elasticOut(t, 0.075, 0.3),
    easeInOutElastic(t) {
      const s = 0.1125;
      const p = 0.45;
      return atEdge(t) ? t : t < 0.5 ? 0.5 * elasticIn(t * 2, s, p) : 0.5 + 0.5 * elasticOut(t * 2 - 1, s, p);
    },
    easeInBack(t) {
      const s = 1.70158;
      return t * t * ((s + 1) * t - s);
    },
    easeOutBack(t) {
      const s = 1.70158;
      return (t -= 1) * t * ((s + 1) * t + s) + 1;
    },
    easeInOutBack(t) {
      let s = 1.70158;
      if ((t /= 0.5) < 1) {
        return 0.5 * (t * t * (((s *= 1.525) + 1) * t - s));
      }
      return 0.5 * ((t -= 2) * t * (((s *= 1.525) + 1) * t + s) + 2);
    },
    easeInBounce: (t) => 1 - effects.easeOutBounce(1 - t),
    easeOutBounce(t) {
      const m = 7.5625;
      const d = 2.75;
      if (t < 1 / d) {
        return m * t * t;
      }
      if (t < 2 / d) {
        return m * (t -= 1.5 / d) * t + 0.75;
      }
      if (t < 2.5 / d) {
        return m * (t -= 2.25 / d) * t + 0.9375;
      }
      return m * (t -= 2.625 / d) * t + 0.984375;
    },
    easeInOutBounce: (t) => t < 0.5 ? effects.easeInBounce(t * 2) * 0.5 : effects.easeOutBounce(t * 2 - 1) * 0.5 + 0.5
  };
  function isPatternOrGradient(value) {
    if (value && typeof value === "object") {
      const type2 = value.toString();
      return type2 === "[object CanvasPattern]" || type2 === "[object CanvasGradient]";
    }
    return false;
  }
  function color2(value) {
    return isPatternOrGradient(value) ? value : new Color2(value);
  }
  function getHoverColor(value) {
    return isPatternOrGradient(value) ? value : new Color2(value).saturate(0.5).darken(0.1).hexString();
  }
  var numbers = [
    "x",
    "y",
    "borderWidth",
    "radius",
    "tension"
  ];
  var colors = [
    "color",
    "borderColor",
    "backgroundColor"
  ];
  function applyAnimationsDefaults(defaults2) {
    defaults2.set("animation", {
      delay: void 0,
      duration: 1e3,
      easing: "easeOutQuart",
      fn: void 0,
      from: void 0,
      loop: void 0,
      to: void 0,
      type: void 0
    });
    defaults2.describe("animation", {
      _fallback: false,
      _indexable: false,
      _scriptable: (name2) => name2 !== "onProgress" && name2 !== "onComplete" && name2 !== "fn"
    });
    defaults2.set("animations", {
      colors: {
        type: "color",
        properties: colors
      },
      numbers: {
        type: "number",
        properties: numbers
      }
    });
    defaults2.describe("animations", {
      _fallback: "animation"
    });
    defaults2.set("transitions", {
      active: {
        animation: {
          duration: 400
        }
      },
      resize: {
        animation: {
          duration: 0
        }
      },
      show: {
        animations: {
          colors: {
            from: "transparent"
          },
          visible: {
            type: "boolean",
            duration: 0
          }
        }
      },
      hide: {
        animations: {
          colors: {
            to: "transparent"
          },
          visible: {
            type: "boolean",
            easing: "linear",
            fn: (v) => v | 0
          }
        }
      }
    });
  }
  function applyLayoutsDefaults(defaults2) {
    defaults2.set("layout", {
      autoPadding: true,
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    });
  }
  var intlCache = /* @__PURE__ */ new Map();
  function getNumberFormat(locale2, options) {
    options = options || {};
    const cacheKey = locale2 + JSON.stringify(options);
    let formatter = intlCache.get(cacheKey);
    if (!formatter) {
      formatter = new Intl.NumberFormat(locale2, options);
      intlCache.set(cacheKey, formatter);
    }
    return formatter;
  }
  function formatNumber(num, locale2, options) {
    return getNumberFormat(locale2, options).format(num);
  }
  var formatters = {
    values(value) {
      return isArray(value) ? value : "" + value;
    },
    numeric(tickValue, index2, ticks2) {
      if (tickValue === 0) {
        return "0";
      }
      const locale2 = this.chart.options.locale;
      let notation;
      let delta = tickValue;
      if (ticks2.length > 1) {
        const maxTick = Math.max(Math.abs(ticks2[0].value), Math.abs(ticks2[ticks2.length - 1].value));
        if (maxTick < 1e-4 || maxTick > 1e15) {
          notation = "scientific";
        }
        delta = calculateDelta(tickValue, ticks2);
      }
      const logDelta = log10(Math.abs(delta));
      const numDecimal = Math.max(Math.min(-1 * Math.floor(logDelta), 20), 0);
      const options = {
        notation,
        minimumFractionDigits: numDecimal,
        maximumFractionDigits: numDecimal
      };
      Object.assign(options, this.options.ticks.format);
      return formatNumber(tickValue, locale2, options);
    },
    logarithmic(tickValue, index2, ticks2) {
      if (tickValue === 0) {
        return "0";
      }
      const remain = ticks2[index2].significand || tickValue / Math.pow(10, Math.floor(log10(tickValue)));
      if ([
        1,
        2,
        3,
        5,
        10,
        15
      ].includes(remain) || index2 > 0.8 * ticks2.length) {
        return formatters.numeric.call(this, tickValue, index2, ticks2);
      }
      return "";
    }
  };
  function calculateDelta(tickValue, ticks2) {
    let delta = ticks2.length > 3 ? ticks2[2].value - ticks2[1].value : ticks2[1].value - ticks2[0].value;
    if (Math.abs(delta) >= 1 && tickValue !== Math.floor(tickValue)) {
      delta = tickValue - Math.floor(tickValue);
    }
    return delta;
  }
  var Ticks = {
    formatters
  };
  function applyScaleDefaults(defaults2) {
    defaults2.set("scale", {
      display: true,
      offset: false,
      reverse: false,
      beginAtZero: false,
      bounds: "ticks",
      grace: 0,
      grid: {
        display: true,
        lineWidth: 1,
        drawOnChartArea: true,
        drawTicks: true,
        tickLength: 8,
        tickWidth: (_ctx, options) => options.lineWidth,
        tickColor: (_ctx, options) => options.color,
        offset: false
      },
      border: {
        display: true,
        dash: [],
        dashOffset: 0,
        width: 1
      },
      title: {
        display: false,
        text: "",
        padding: {
          top: 4,
          bottom: 4
        }
      },
      ticks: {
        minRotation: 0,
        maxRotation: 50,
        mirror: false,
        textStrokeWidth: 0,
        textStrokeColor: "",
        padding: 3,
        display: true,
        autoSkip: true,
        autoSkipPadding: 3,
        labelOffset: 0,
        callback: Ticks.formatters.values,
        minor: {},
        major: {},
        align: "center",
        crossAlign: "near",
        showLabelBackdrop: false,
        backdropColor: "rgba(255, 255, 255, 0.75)",
        backdropPadding: 2
      }
    });
    defaults2.route("scale.ticks", "color", "", "color");
    defaults2.route("scale.grid", "color", "", "borderColor");
    defaults2.route("scale.border", "color", "", "borderColor");
    defaults2.route("scale.title", "color", "", "color");
    defaults2.describe("scale", {
      _fallback: false,
      _scriptable: (name2) => !name2.startsWith("before") && !name2.startsWith("after") && name2 !== "callback" && name2 !== "parser",
      _indexable: (name2) => name2 !== "borderDash" && name2 !== "tickBorderDash" && name2 !== "dash"
    });
    defaults2.describe("scales", {
      _fallback: "scale"
    });
    defaults2.describe("scale.ticks", {
      _scriptable: (name2) => name2 !== "backdropPadding" && name2 !== "callback",
      _indexable: (name2) => name2 !== "backdropPadding"
    });
  }
  var overrides = /* @__PURE__ */ Object.create(null);
  var descriptors = /* @__PURE__ */ Object.create(null);
  function getScope$1(node, key) {
    if (!key) {
      return node;
    }
    const keys = key.split(".");
    for (let i = 0, n = keys.length; i < n; ++i) {
      const k = keys[i];
      node = node[k] || (node[k] = /* @__PURE__ */ Object.create(null));
    }
    return node;
  }
  function set3(root2, scope, values) {
    if (typeof scope === "string") {
      return merge(getScope$1(root2, scope), values);
    }
    return merge(getScope$1(root2, ""), scope);
  }
  var Defaults = class {
    constructor(_descriptors2, _appliers) {
      this.animation = void 0;
      this.backgroundColor = "rgba(0,0,0,0.1)";
      this.borderColor = "rgba(0,0,0,0.1)";
      this.color = "#666";
      this.datasets = {};
      this.devicePixelRatio = (context) => context.chart.platform.getDevicePixelRatio();
      this.elements = {};
      this.events = [
        "mousemove",
        "mouseout",
        "click",
        "touchstart",
        "touchmove"
      ];
      this.font = {
        family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
        size: 12,
        style: "normal",
        lineHeight: 1.2,
        weight: null
      };
      this.hover = {};
      this.hoverBackgroundColor = (ctx, options) => getHoverColor(options.backgroundColor);
      this.hoverBorderColor = (ctx, options) => getHoverColor(options.borderColor);
      this.hoverColor = (ctx, options) => getHoverColor(options.color);
      this.indexAxis = "x";
      this.interaction = {
        mode: "nearest",
        intersect: true,
        includeInvisible: false
      };
      this.maintainAspectRatio = true;
      this.onHover = null;
      this.onClick = null;
      this.parsing = true;
      this.plugins = {};
      this.responsive = true;
      this.scale = void 0;
      this.scales = {};
      this.showLine = true;
      this.drawActiveElementsOnTop = true;
      this.describe(_descriptors2);
      this.apply(_appliers);
    }
    set(scope, values) {
      return set3(this, scope, values);
    }
    get(scope) {
      return getScope$1(this, scope);
    }
    describe(scope, values) {
      return set3(descriptors, scope, values);
    }
    override(scope, values) {
      return set3(overrides, scope, values);
    }
    route(scope, name2, targetScope, targetName) {
      const scopeObject = getScope$1(this, scope);
      const targetScopeObject = getScope$1(this, targetScope);
      const privateName = "_" + name2;
      Object.defineProperties(scopeObject, {
        [privateName]: {
          value: scopeObject[name2],
          writable: true
        },
        [name2]: {
          enumerable: true,
          get() {
            const local = this[privateName];
            const target = targetScopeObject[targetName];
            if (isObject(local)) {
              return Object.assign({}, target, local);
            }
            return valueOrDefault(local, target);
          },
          set(value) {
            this[privateName] = value;
          }
        }
      });
    }
    apply(appliers) {
      appliers.forEach((apply) => apply(this));
    }
  };
  var defaults = /* @__PURE__ */ new Defaults({
    _scriptable: (name2) => !name2.startsWith("on"),
    _indexable: (name2) => name2 !== "events",
    hover: {
      _fallback: "interaction"
    },
    interaction: {
      _scriptable: false,
      _indexable: false
    }
  }, [
    applyAnimationsDefaults,
    applyLayoutsDefaults,
    applyScaleDefaults
  ]);
  function toFontString(font) {
    if (!font || isNullOrUndef(font.size) || isNullOrUndef(font.family)) {
      return null;
    }
    return (font.style ? font.style + " " : "") + (font.weight ? font.weight + " " : "") + font.size + "px " + font.family;
  }
  function _measureText(ctx, data, gc, longest, string) {
    let textWidth = data[string];
    if (!textWidth) {
      textWidth = data[string] = ctx.measureText(string).width;
      gc.push(string);
    }
    if (textWidth > longest) {
      longest = textWidth;
    }
    return longest;
  }
  function _longestText(ctx, font, arrayOfThings, cache) {
    cache = cache || {};
    let data = cache.data = cache.data || {};
    let gc = cache.garbageCollect = cache.garbageCollect || [];
    if (cache.font !== font) {
      data = cache.data = {};
      gc = cache.garbageCollect = [];
      cache.font = font;
    }
    ctx.save();
    ctx.font = font;
    let longest = 0;
    const ilen = arrayOfThings.length;
    let i, j, jlen, thing, nestedThing;
    for (i = 0; i < ilen; i++) {
      thing = arrayOfThings[i];
      if (thing !== void 0 && thing !== null && isArray(thing) !== true) {
        longest = _measureText(ctx, data, gc, longest, thing);
      } else if (isArray(thing)) {
        for (j = 0, jlen = thing.length; j < jlen; j++) {
          nestedThing = thing[j];
          if (nestedThing !== void 0 && nestedThing !== null && !isArray(nestedThing)) {
            longest = _measureText(ctx, data, gc, longest, nestedThing);
          }
        }
      }
    }
    ctx.restore();
    const gcLen = gc.length / 2;
    if (gcLen > arrayOfThings.length) {
      for (i = 0; i < gcLen; i++) {
        delete data[gc[i]];
      }
      gc.splice(0, gcLen);
    }
    return longest;
  }
  function _alignPixel(chart, pixel, width) {
    const devicePixelRatio = chart.currentDevicePixelRatio;
    const halfWidth = width !== 0 ? Math.max(width / 2, 0.5) : 0;
    return Math.round((pixel - halfWidth) * devicePixelRatio) / devicePixelRatio + halfWidth;
  }
  function clearCanvas(canvas, ctx) {
    ctx = ctx || canvas.getContext("2d");
    ctx.save();
    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  function drawPoint(ctx, options, x, y) {
    drawPointLegend(ctx, options, x, y, null);
  }
  function drawPointLegend(ctx, options, x, y, w) {
    let type2, xOffset, yOffset, size, cornerRadius, width, xOffsetW, yOffsetW;
    const style = options.pointStyle;
    const rotation = options.rotation;
    const radius = options.radius;
    let rad = (rotation || 0) * RAD_PER_DEG;
    if (style && typeof style === "object") {
      type2 = style.toString();
      if (type2 === "[object HTMLImageElement]" || type2 === "[object HTMLCanvasElement]") {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rad);
        ctx.drawImage(style, -style.width / 2, -style.height / 2, style.width, style.height);
        ctx.restore();
        return;
      }
    }
    if (isNaN(radius) || radius <= 0) {
      return;
    }
    ctx.beginPath();
    switch (style) {
      default:
        if (w) {
          ctx.ellipse(x, y, w / 2, radius, 0, 0, TAU);
        } else {
          ctx.arc(x, y, radius, 0, TAU);
        }
        ctx.closePath();
        break;
      case "triangle":
        width = w ? w / 2 : radius;
        ctx.moveTo(x + Math.sin(rad) * width, y - Math.cos(rad) * radius);
        rad += TWO_THIRDS_PI;
        ctx.lineTo(x + Math.sin(rad) * width, y - Math.cos(rad) * radius);
        rad += TWO_THIRDS_PI;
        ctx.lineTo(x + Math.sin(rad) * width, y - Math.cos(rad) * radius);
        ctx.closePath();
        break;
      case "rectRounded":
        cornerRadius = radius * 0.516;
        size = radius - cornerRadius;
        xOffset = Math.cos(rad + QUARTER_PI) * size;
        xOffsetW = Math.cos(rad + QUARTER_PI) * (w ? w / 2 - cornerRadius : size);
        yOffset = Math.sin(rad + QUARTER_PI) * size;
        yOffsetW = Math.sin(rad + QUARTER_PI) * (w ? w / 2 - cornerRadius : size);
        ctx.arc(x - xOffsetW, y - yOffset, cornerRadius, rad - PI, rad - HALF_PI);
        ctx.arc(x + yOffsetW, y - xOffset, cornerRadius, rad - HALF_PI, rad);
        ctx.arc(x + xOffsetW, y + yOffset, cornerRadius, rad, rad + HALF_PI);
        ctx.arc(x - yOffsetW, y + xOffset, cornerRadius, rad + HALF_PI, rad + PI);
        ctx.closePath();
        break;
      case "rect":
        if (!rotation) {
          size = Math.SQRT1_2 * radius;
          width = w ? w / 2 : size;
          ctx.rect(x - width, y - size, 2 * width, 2 * size);
          break;
        }
        rad += QUARTER_PI;
      case "rectRot":
        xOffsetW = Math.cos(rad) * (w ? w / 2 : radius);
        xOffset = Math.cos(rad) * radius;
        yOffset = Math.sin(rad) * radius;
        yOffsetW = Math.sin(rad) * (w ? w / 2 : radius);
        ctx.moveTo(x - xOffsetW, y - yOffset);
        ctx.lineTo(x + yOffsetW, y - xOffset);
        ctx.lineTo(x + xOffsetW, y + yOffset);
        ctx.lineTo(x - yOffsetW, y + xOffset);
        ctx.closePath();
        break;
      case "crossRot":
        rad += QUARTER_PI;
      case "cross":
        xOffsetW = Math.cos(rad) * (w ? w / 2 : radius);
        xOffset = Math.cos(rad) * radius;
        yOffset = Math.sin(rad) * radius;
        yOffsetW = Math.sin(rad) * (w ? w / 2 : radius);
        ctx.moveTo(x - xOffsetW, y - yOffset);
        ctx.lineTo(x + xOffsetW, y + yOffset);
        ctx.moveTo(x + yOffsetW, y - xOffset);
        ctx.lineTo(x - yOffsetW, y + xOffset);
        break;
      case "star":
        xOffsetW = Math.cos(rad) * (w ? w / 2 : radius);
        xOffset = Math.cos(rad) * radius;
        yOffset = Math.sin(rad) * radius;
        yOffsetW = Math.sin(rad) * (w ? w / 2 : radius);
        ctx.moveTo(x - xOffsetW, y - yOffset);
        ctx.lineTo(x + xOffsetW, y + yOffset);
        ctx.moveTo(x + yOffsetW, y - xOffset);
        ctx.lineTo(x - yOffsetW, y + xOffset);
        rad += QUARTER_PI;
        xOffsetW = Math.cos(rad) * (w ? w / 2 : radius);
        xOffset = Math.cos(rad) * radius;
        yOffset = Math.sin(rad) * radius;
        yOffsetW = Math.sin(rad) * (w ? w / 2 : radius);
        ctx.moveTo(x - xOffsetW, y - yOffset);
        ctx.lineTo(x + xOffsetW, y + yOffset);
        ctx.moveTo(x + yOffsetW, y - xOffset);
        ctx.lineTo(x - yOffsetW, y + xOffset);
        break;
      case "line":
        xOffset = w ? w / 2 : Math.cos(rad) * radius;
        yOffset = Math.sin(rad) * radius;
        ctx.moveTo(x - xOffset, y - yOffset);
        ctx.lineTo(x + xOffset, y + yOffset);
        break;
      case "dash":
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(rad) * (w ? w / 2 : radius), y + Math.sin(rad) * radius);
        break;
      case false:
        ctx.closePath();
        break;
    }
    ctx.fill();
    if (options.borderWidth > 0) {
      ctx.stroke();
    }
  }
  function _isPointInArea(point, area, margin) {
    margin = margin || 0.5;
    return !area || point && point.x > area.left - margin && point.x < area.right + margin && point.y > area.top - margin && point.y < area.bottom + margin;
  }
  function clipArea(ctx, area) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(area.left, area.top, area.right - area.left, area.bottom - area.top);
    ctx.clip();
  }
  function unclipArea(ctx) {
    ctx.restore();
  }
  function _steppedLineTo(ctx, previous, target, flip, mode) {
    if (!previous) {
      return ctx.lineTo(target.x, target.y);
    }
    if (mode === "middle") {
      const midpoint = (previous.x + target.x) / 2;
      ctx.lineTo(midpoint, previous.y);
      ctx.lineTo(midpoint, target.y);
    } else if (mode === "after" !== !!flip) {
      ctx.lineTo(previous.x, target.y);
    } else {
      ctx.lineTo(target.x, previous.y);
    }
    ctx.lineTo(target.x, target.y);
  }
  function _bezierCurveTo(ctx, previous, target, flip) {
    if (!previous) {
      return ctx.lineTo(target.x, target.y);
    }
    ctx.bezierCurveTo(flip ? previous.cp1x : previous.cp2x, flip ? previous.cp1y : previous.cp2y, flip ? target.cp2x : target.cp1x, flip ? target.cp2y : target.cp1y, target.x, target.y);
  }
  function renderText(ctx, text, x, y, font, opts = {}) {
    const lines = isArray(text) ? text : [
      text
    ];
    const stroke = opts.strokeWidth > 0 && opts.strokeColor !== "";
    let i, line;
    ctx.save();
    ctx.font = font.string;
    setRenderOpts(ctx, opts);
    for (i = 0; i < lines.length; ++i) {
      line = lines[i];
      if (opts.backdrop) {
        drawBackdrop(ctx, opts.backdrop);
      }
      if (stroke) {
        if (opts.strokeColor) {
          ctx.strokeStyle = opts.strokeColor;
        }
        if (!isNullOrUndef(opts.strokeWidth)) {
          ctx.lineWidth = opts.strokeWidth;
        }
        ctx.strokeText(line, x, y, opts.maxWidth);
      }
      ctx.fillText(line, x, y, opts.maxWidth);
      decorateText(ctx, x, y, line, opts);
      y += font.lineHeight;
    }
    ctx.restore();
  }
  function setRenderOpts(ctx, opts) {
    if (opts.translation) {
      ctx.translate(opts.translation[0], opts.translation[1]);
    }
    if (!isNullOrUndef(opts.rotation)) {
      ctx.rotate(opts.rotation);
    }
    if (opts.color) {
      ctx.fillStyle = opts.color;
    }
    if (opts.textAlign) {
      ctx.textAlign = opts.textAlign;
    }
    if (opts.textBaseline) {
      ctx.textBaseline = opts.textBaseline;
    }
  }
  function decorateText(ctx, x, y, line, opts) {
    if (opts.strikethrough || opts.underline) {
      const metrics = ctx.measureText(line);
      const left = x - metrics.actualBoundingBoxLeft;
      const right = x + metrics.actualBoundingBoxRight;
      const top = y - metrics.actualBoundingBoxAscent;
      const bottom = y + metrics.actualBoundingBoxDescent;
      const yDecoration = opts.strikethrough ? (top + bottom) / 2 : bottom;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.beginPath();
      ctx.lineWidth = opts.decorationWidth || 2;
      ctx.moveTo(left, yDecoration);
      ctx.lineTo(right, yDecoration);
      ctx.stroke();
    }
  }
  function drawBackdrop(ctx, opts) {
    const oldColor = ctx.fillStyle;
    ctx.fillStyle = opts.color;
    ctx.fillRect(opts.left, opts.top, opts.width, opts.height);
    ctx.fillStyle = oldColor;
  }
  function addRoundedRectPath(ctx, rect) {
    const { x, y, w, h, radius } = rect;
    ctx.arc(x + radius.topLeft, y + radius.topLeft, radius.topLeft, -HALF_PI, PI, true);
    ctx.lineTo(x, y + h - radius.bottomLeft);
    ctx.arc(x + radius.bottomLeft, y + h - radius.bottomLeft, radius.bottomLeft, PI, HALF_PI, true);
    ctx.lineTo(x + w - radius.bottomRight, y + h);
    ctx.arc(x + w - radius.bottomRight, y + h - radius.bottomRight, radius.bottomRight, HALF_PI, 0, true);
    ctx.lineTo(x + w, y + radius.topRight);
    ctx.arc(x + w - radius.topRight, y + radius.topRight, radius.topRight, 0, -HALF_PI, true);
    ctx.lineTo(x + radius.topLeft, y);
  }
  var LINE_HEIGHT = /^(normal|(\d+(?:\.\d+)?)(px|em|%)?)$/;
  var FONT_STYLE = /^(normal|italic|initial|inherit|unset|(oblique( -?[0-9]?[0-9]deg)?))$/;
  function toLineHeight(value, size) {
    const matches = ("" + value).match(LINE_HEIGHT);
    if (!matches || matches[1] === "normal") {
      return size * 1.2;
    }
    value = +matches[2];
    switch (matches[3]) {
      case "px":
        return value;
      case "%":
        value /= 100;
        break;
    }
    return size * value;
  }
  var numberOrZero = (v) => +v || 0;
  function _readValueToProps(value, props) {
    const ret = {};
    const objProps = isObject(props);
    const keys = objProps ? Object.keys(props) : props;
    const read = isObject(value) ? objProps ? (prop) => valueOrDefault(value[prop], value[props[prop]]) : (prop) => value[prop] : () => value;
    for (const prop of keys) {
      ret[prop] = numberOrZero(read(prop));
    }
    return ret;
  }
  function toTRBL(value) {
    return _readValueToProps(value, {
      top: "y",
      right: "x",
      bottom: "y",
      left: "x"
    });
  }
  function toTRBLCorners(value) {
    return _readValueToProps(value, [
      "topLeft",
      "topRight",
      "bottomLeft",
      "bottomRight"
    ]);
  }
  function toPadding(value) {
    const obj = toTRBL(value);
    obj.width = obj.left + obj.right;
    obj.height = obj.top + obj.bottom;
    return obj;
  }
  function toFont(options, fallback) {
    options = options || {};
    fallback = fallback || defaults.font;
    let size = valueOrDefault(options.size, fallback.size);
    if (typeof size === "string") {
      size = parseInt(size, 10);
    }
    let style = valueOrDefault(options.style, fallback.style);
    if (style && !("" + style).match(FONT_STYLE)) {
      console.warn('Invalid font style specified: "' + style + '"');
      style = void 0;
    }
    const font = {
      family: valueOrDefault(options.family, fallback.family),
      lineHeight: toLineHeight(valueOrDefault(options.lineHeight, fallback.lineHeight), size),
      size,
      style,
      weight: valueOrDefault(options.weight, fallback.weight),
      string: ""
    };
    font.string = toFontString(font);
    return font;
  }
  function resolve(inputs, context, index2, info) {
    let cacheable = true;
    let i, ilen, value;
    for (i = 0, ilen = inputs.length; i < ilen; ++i) {
      value = inputs[i];
      if (value === void 0) {
        continue;
      }
      if (context !== void 0 && typeof value === "function") {
        value = value(context);
        cacheable = false;
      }
      if (index2 !== void 0 && isArray(value)) {
        value = value[index2 % value.length];
        cacheable = false;
      }
      if (value !== void 0) {
        if (info && !cacheable) {
          info.cacheable = false;
        }
        return value;
      }
    }
  }
  function _addGrace(minmax, grace, beginAtZero) {
    const { min: min2, max: max2 } = minmax;
    const change = toDimension(grace, (max2 - min2) / 2);
    const keepZero = (value, add) => beginAtZero && value === 0 ? 0 : value + add;
    return {
      min: keepZero(min2, -Math.abs(change)),
      max: keepZero(max2, change)
    };
  }
  function createContext(parentContext, context) {
    return Object.assign(Object.create(parentContext), context);
  }
  function _createResolver(scopes, prefixes2 = [
    ""
  ], rootScopes = scopes, fallback, getTarget = () => scopes[0]) {
    if (!defined(fallback)) {
      fallback = _resolve("_fallback", scopes);
    }
    const cache = {
      [Symbol.toStringTag]: "Object",
      _cacheable: true,
      _scopes: scopes,
      _rootScopes: rootScopes,
      _fallback: fallback,
      _getTarget: getTarget,
      override: (scope) => _createResolver([
        scope,
        ...scopes
      ], prefixes2, rootScopes, fallback)
    };
    return new Proxy(cache, {
      deleteProperty(target, prop) {
        delete target[prop];
        delete target._keys;
        delete scopes[0][prop];
        return true;
      },
      get(target, prop) {
        return _cached(target, prop, () => _resolveWithPrefixes(prop, prefixes2, scopes, target));
      },
      getOwnPropertyDescriptor(target, prop) {
        return Reflect.getOwnPropertyDescriptor(target._scopes[0], prop);
      },
      getPrototypeOf() {
        return Reflect.getPrototypeOf(scopes[0]);
      },
      has(target, prop) {
        return getKeysFromAllScopes(target).includes(prop);
      },
      ownKeys(target) {
        return getKeysFromAllScopes(target);
      },
      set(target, prop, value) {
        const storage = target._storage || (target._storage = getTarget());
        target[prop] = storage[prop] = value;
        delete target._keys;
        return true;
      }
    });
  }
  function _attachContext(proxy, context, subProxy, descriptorDefaults) {
    const cache = {
      _cacheable: false,
      _proxy: proxy,
      _context: context,
      _subProxy: subProxy,
      _stack: /* @__PURE__ */ new Set(),
      _descriptors: _descriptors(proxy, descriptorDefaults),
      setContext: (ctx) => _attachContext(proxy, ctx, subProxy, descriptorDefaults),
      override: (scope) => _attachContext(proxy.override(scope), context, subProxy, descriptorDefaults)
    };
    return new Proxy(cache, {
      deleteProperty(target, prop) {
        delete target[prop];
        delete proxy[prop];
        return true;
      },
      get(target, prop, receiver) {
        return _cached(target, prop, () => _resolveWithContext(target, prop, receiver));
      },
      getOwnPropertyDescriptor(target, prop) {
        return target._descriptors.allKeys ? Reflect.has(proxy, prop) ? {
          enumerable: true,
          configurable: true
        } : void 0 : Reflect.getOwnPropertyDescriptor(proxy, prop);
      },
      getPrototypeOf() {
        return Reflect.getPrototypeOf(proxy);
      },
      has(target, prop) {
        return Reflect.has(proxy, prop);
      },
      ownKeys() {
        return Reflect.ownKeys(proxy);
      },
      set(target, prop, value) {
        proxy[prop] = value;
        delete target[prop];
        return true;
      }
    });
  }
  function _descriptors(proxy, defaults2 = {
    scriptable: true,
    indexable: true
  }) {
    const { _scriptable = defaults2.scriptable, _indexable = defaults2.indexable, _allKeys = defaults2.allKeys } = proxy;
    return {
      allKeys: _allKeys,
      scriptable: _scriptable,
      indexable: _indexable,
      isScriptable: isFunction(_scriptable) ? _scriptable : () => _scriptable,
      isIndexable: isFunction(_indexable) ? _indexable : () => _indexable
    };
  }
  var readKey = (prefix, name2) => prefix ? prefix + _capitalize(name2) : name2;
  var needsSubResolver = (prop, value) => isObject(value) && prop !== "adapters" && (Object.getPrototypeOf(value) === null || value.constructor === Object);
  function _cached(target, prop, resolve2) {
    if (Object.prototype.hasOwnProperty.call(target, prop)) {
      return target[prop];
    }
    const value = resolve2();
    target[prop] = value;
    return value;
  }
  function _resolveWithContext(target, prop, receiver) {
    const { _proxy, _context, _subProxy, _descriptors: descriptors2 } = target;
    let value = _proxy[prop];
    if (isFunction(value) && descriptors2.isScriptable(prop)) {
      value = _resolveScriptable(prop, value, target, receiver);
    }
    if (isArray(value) && value.length) {
      value = _resolveArray(prop, value, target, descriptors2.isIndexable);
    }
    if (needsSubResolver(prop, value)) {
      value = _attachContext(value, _context, _subProxy && _subProxy[prop], descriptors2);
    }
    return value;
  }
  function _resolveScriptable(prop, value, target, receiver) {
    const { _proxy, _context, _subProxy, _stack } = target;
    if (_stack.has(prop)) {
      throw new Error("Recursion detected: " + Array.from(_stack).join("->") + "->" + prop);
    }
    _stack.add(prop);
    value = value(_context, _subProxy || receiver);
    _stack.delete(prop);
    if (needsSubResolver(prop, value)) {
      value = createSubResolver(_proxy._scopes, _proxy, prop, value);
    }
    return value;
  }
  function _resolveArray(prop, value, target, isIndexable) {
    const { _proxy, _context, _subProxy, _descriptors: descriptors2 } = target;
    if (defined(_context.index) && isIndexable(prop)) {
      value = value[_context.index % value.length];
    } else if (isObject(value[0])) {
      const arr = value;
      const scopes = _proxy._scopes.filter((s) => s !== arr);
      value = [];
      for (const item of arr) {
        const resolver = createSubResolver(scopes, _proxy, prop, item);
        value.push(_attachContext(resolver, _context, _subProxy && _subProxy[prop], descriptors2));
      }
    }
    return value;
  }
  function resolveFallback(fallback, prop, value) {
    return isFunction(fallback) ? fallback(prop, value) : fallback;
  }
  var getScope = (key, parent) => key === true ? parent : typeof key === "string" ? resolveObjectKey(parent, key) : void 0;
  function addScopes(set4, parentScopes, key, parentFallback, value) {
    for (const parent of parentScopes) {
      const scope = getScope(key, parent);
      if (scope) {
        set4.add(scope);
        const fallback = resolveFallback(scope._fallback, key, value);
        if (defined(fallback) && fallback !== key && fallback !== parentFallback) {
          return fallback;
        }
      } else if (scope === false && defined(parentFallback) && key !== parentFallback) {
        return null;
      }
    }
    return false;
  }
  function createSubResolver(parentScopes, resolver, prop, value) {
    const rootScopes = resolver._rootScopes;
    const fallback = resolveFallback(resolver._fallback, prop, value);
    const allScopes = [
      ...parentScopes,
      ...rootScopes
    ];
    const set4 = /* @__PURE__ */ new Set();
    set4.add(value);
    let key = addScopesFromKey(set4, allScopes, prop, fallback || prop, value);
    if (key === null) {
      return false;
    }
    if (defined(fallback) && fallback !== prop) {
      key = addScopesFromKey(set4, allScopes, fallback, key, value);
      if (key === null) {
        return false;
      }
    }
    return _createResolver(Array.from(set4), [
      ""
    ], rootScopes, fallback, () => subGetTarget(resolver, prop, value));
  }
  function addScopesFromKey(set4, allScopes, key, fallback, item) {
    while (key) {
      key = addScopes(set4, allScopes, key, fallback, item);
    }
    return key;
  }
  function subGetTarget(resolver, prop, value) {
    const parent = resolver._getTarget();
    if (!(prop in parent)) {
      parent[prop] = {};
    }
    const target = parent[prop];
    if (isArray(target) && isObject(value)) {
      return value;
    }
    return target || {};
  }
  function _resolveWithPrefixes(prop, prefixes2, scopes, proxy) {
    let value;
    for (const prefix of prefixes2) {
      value = _resolve(readKey(prefix, prop), scopes);
      if (defined(value)) {
        return needsSubResolver(prop, value) ? createSubResolver(scopes, proxy, prop, value) : value;
      }
    }
  }
  function _resolve(key, scopes) {
    for (const scope of scopes) {
      if (!scope) {
        continue;
      }
      const value = scope[key];
      if (defined(value)) {
        return value;
      }
    }
  }
  function getKeysFromAllScopes(target) {
    let keys = target._keys;
    if (!keys) {
      keys = target._keys = resolveKeysFromAllScopes(target._scopes);
    }
    return keys;
  }
  function resolveKeysFromAllScopes(scopes) {
    const set4 = /* @__PURE__ */ new Set();
    for (const scope of scopes) {
      for (const key of Object.keys(scope).filter((k) => !k.startsWith("_"))) {
        set4.add(key);
      }
    }
    return Array.from(set4);
  }
  function _parseObjectDataRadialScale(meta, data, start2, count) {
    const { iScale } = meta;
    const { key = "r" } = this._parsing;
    const parsed = new Array(count);
    let i, ilen, index2, item;
    for (i = 0, ilen = count; i < ilen; ++i) {
      index2 = i + start2;
      item = data[index2];
      parsed[i] = {
        r: iScale.parse(resolveObjectKey(item, key), index2)
      };
    }
    return parsed;
  }
  var EPSILON = Number.EPSILON || 1e-14;
  var getPoint = (points, i) => i < points.length && !points[i].skip && points[i];
  var getValueAxis = (indexAxis) => indexAxis === "x" ? "y" : "x";
  function splineCurve(firstPoint, middlePoint, afterPoint, t) {
    const previous = firstPoint.skip ? middlePoint : firstPoint;
    const current = middlePoint;
    const next = afterPoint.skip ? middlePoint : afterPoint;
    const d01 = distanceBetweenPoints(current, previous);
    const d12 = distanceBetweenPoints(next, current);
    let s01 = d01 / (d01 + d12);
    let s12 = d12 / (d01 + d12);
    s01 = isNaN(s01) ? 0 : s01;
    s12 = isNaN(s12) ? 0 : s12;
    const fa = t * s01;
    const fb = t * s12;
    return {
      previous: {
        x: current.x - fa * (next.x - previous.x),
        y: current.y - fa * (next.y - previous.y)
      },
      next: {
        x: current.x + fb * (next.x - previous.x),
        y: current.y + fb * (next.y - previous.y)
      }
    };
  }
  function monotoneAdjust(points, deltaK, mK) {
    const pointsLen = points.length;
    let alphaK, betaK, tauK, squaredMagnitude, pointCurrent;
    let pointAfter = getPoint(points, 0);
    for (let i = 0; i < pointsLen - 1; ++i) {
      pointCurrent = pointAfter;
      pointAfter = getPoint(points, i + 1);
      if (!pointCurrent || !pointAfter) {
        continue;
      }
      if (almostEquals(deltaK[i], 0, EPSILON)) {
        mK[i] = mK[i + 1] = 0;
        continue;
      }
      alphaK = mK[i] / deltaK[i];
      betaK = mK[i + 1] / deltaK[i];
      squaredMagnitude = Math.pow(alphaK, 2) + Math.pow(betaK, 2);
      if (squaredMagnitude <= 9) {
        continue;
      }
      tauK = 3 / Math.sqrt(squaredMagnitude);
      mK[i] = alphaK * tauK * deltaK[i];
      mK[i + 1] = betaK * tauK * deltaK[i];
    }
  }
  function monotoneCompute(points, mK, indexAxis = "x") {
    const valueAxis = getValueAxis(indexAxis);
    const pointsLen = points.length;
    let delta, pointBefore, pointCurrent;
    let pointAfter = getPoint(points, 0);
    for (let i = 0; i < pointsLen; ++i) {
      pointBefore = pointCurrent;
      pointCurrent = pointAfter;
      pointAfter = getPoint(points, i + 1);
      if (!pointCurrent) {
        continue;
      }
      const iPixel = pointCurrent[indexAxis];
      const vPixel = pointCurrent[valueAxis];
      if (pointBefore) {
        delta = (iPixel - pointBefore[indexAxis]) / 3;
        pointCurrent[`cp1${indexAxis}`] = iPixel - delta;
        pointCurrent[`cp1${valueAxis}`] = vPixel - delta * mK[i];
      }
      if (pointAfter) {
        delta = (pointAfter[indexAxis] - iPixel) / 3;
        pointCurrent[`cp2${indexAxis}`] = iPixel + delta;
        pointCurrent[`cp2${valueAxis}`] = vPixel + delta * mK[i];
      }
    }
  }
  function splineCurveMonotone(points, indexAxis = "x") {
    const valueAxis = getValueAxis(indexAxis);
    const pointsLen = points.length;
    const deltaK = Array(pointsLen).fill(0);
    const mK = Array(pointsLen);
    let i, pointBefore, pointCurrent;
    let pointAfter = getPoint(points, 0);
    for (i = 0; i < pointsLen; ++i) {
      pointBefore = pointCurrent;
      pointCurrent = pointAfter;
      pointAfter = getPoint(points, i + 1);
      if (!pointCurrent) {
        continue;
      }
      if (pointAfter) {
        const slopeDelta = pointAfter[indexAxis] - pointCurrent[indexAxis];
        deltaK[i] = slopeDelta !== 0 ? (pointAfter[valueAxis] - pointCurrent[valueAxis]) / slopeDelta : 0;
      }
      mK[i] = !pointBefore ? deltaK[i] : !pointAfter ? deltaK[i - 1] : sign(deltaK[i - 1]) !== sign(deltaK[i]) ? 0 : (deltaK[i - 1] + deltaK[i]) / 2;
    }
    monotoneAdjust(points, deltaK, mK);
    monotoneCompute(points, mK, indexAxis);
  }
  function capControlPoint(pt, min2, max2) {
    return Math.max(Math.min(pt, max2), min2);
  }
  function capBezierPoints(points, area) {
    let i, ilen, point, inArea, inAreaPrev;
    let inAreaNext = _isPointInArea(points[0], area);
    for (i = 0, ilen = points.length; i < ilen; ++i) {
      inAreaPrev = inArea;
      inArea = inAreaNext;
      inAreaNext = i < ilen - 1 && _isPointInArea(points[i + 1], area);
      if (!inArea) {
        continue;
      }
      point = points[i];
      if (inAreaPrev) {
        point.cp1x = capControlPoint(point.cp1x, area.left, area.right);
        point.cp1y = capControlPoint(point.cp1y, area.top, area.bottom);
      }
      if (inAreaNext) {
        point.cp2x = capControlPoint(point.cp2x, area.left, area.right);
        point.cp2y = capControlPoint(point.cp2y, area.top, area.bottom);
      }
    }
  }
  function _updateBezierControlPoints(points, options, area, loop, indexAxis) {
    let i, ilen, point, controlPoints;
    if (options.spanGaps) {
      points = points.filter((pt) => !pt.skip);
    }
    if (options.cubicInterpolationMode === "monotone") {
      splineCurveMonotone(points, indexAxis);
    } else {
      let prev = loop ? points[points.length - 1] : points[0];
      for (i = 0, ilen = points.length; i < ilen; ++i) {
        point = points[i];
        controlPoints = splineCurve(prev, point, points[Math.min(i + 1, ilen - (loop ? 0 : 1)) % ilen], options.tension);
        point.cp1x = controlPoints.previous.x;
        point.cp1y = controlPoints.previous.y;
        point.cp2x = controlPoints.next.x;
        point.cp2y = controlPoints.next.y;
        prev = point;
      }
    }
    if (options.capBezierPoints) {
      capBezierPoints(points, area);
    }
  }
  function _isDomSupported() {
    return typeof window !== "undefined" && typeof document !== "undefined";
  }
  function _getParentNode(domNode) {
    let parent = domNode.parentNode;
    if (parent && parent.toString() === "[object ShadowRoot]") {
      parent = parent.host;
    }
    return parent;
  }
  function parseMaxStyle(styleValue2, node, parentProperty) {
    let valueInPixels;
    if (typeof styleValue2 === "string") {
      valueInPixels = parseInt(styleValue2, 10);
      if (styleValue2.indexOf("%") !== -1) {
        valueInPixels = valueInPixels / 100 * node.parentNode[parentProperty];
      }
    } else {
      valueInPixels = styleValue2;
    }
    return valueInPixels;
  }
  var getComputedStyle = (element) => element.ownerDocument.defaultView.getComputedStyle(element, null);
  function getStyle(el, property) {
    return getComputedStyle(el).getPropertyValue(property);
  }
  var positions = [
    "top",
    "right",
    "bottom",
    "left"
  ];
  function getPositionedStyle(styles, style, suffix) {
    const result = {};
    suffix = suffix ? "-" + suffix : "";
    for (let i = 0; i < 4; i++) {
      const pos = positions[i];
      result[pos] = parseFloat(styles[style + "-" + pos + suffix]) || 0;
    }
    result.width = result.left + result.right;
    result.height = result.top + result.bottom;
    return result;
  }
  var useOffsetPos = (x, y, target) => (x > 0 || y > 0) && (!target || !target.shadowRoot);
  function getCanvasPosition(e, canvas) {
    const touches = e.touches;
    const source = touches && touches.length ? touches[0] : e;
    const { offsetX, offsetY } = source;
    let box = false;
    let x, y;
    if (useOffsetPos(offsetX, offsetY, e.target)) {
      x = offsetX;
      y = offsetY;
    } else {
      const rect = canvas.getBoundingClientRect();
      x = source.clientX - rect.left;
      y = source.clientY - rect.top;
      box = true;
    }
    return {
      x,
      y,
      box
    };
  }
  function getRelativePosition(event, chart) {
    if ("native" in event) {
      return event;
    }
    const { canvas, currentDevicePixelRatio } = chart;
    const style = getComputedStyle(canvas);
    const borderBox = style.boxSizing === "border-box";
    const paddings = getPositionedStyle(style, "padding");
    const borders = getPositionedStyle(style, "border", "width");
    const { x, y, box } = getCanvasPosition(event, canvas);
    const xOffset = paddings.left + (box && borders.left);
    const yOffset = paddings.top + (box && borders.top);
    let { width, height } = chart;
    if (borderBox) {
      width -= paddings.width + borders.width;
      height -= paddings.height + borders.height;
    }
    return {
      x: Math.round((x - xOffset) / width * canvas.width / currentDevicePixelRatio),
      y: Math.round((y - yOffset) / height * canvas.height / currentDevicePixelRatio)
    };
  }
  function getContainerSize(canvas, width, height) {
    let maxWidth, maxHeight;
    if (width === void 0 || height === void 0) {
      const container = _getParentNode(canvas);
      if (!container) {
        width = canvas.clientWidth;
        height = canvas.clientHeight;
      } else {
        const rect = container.getBoundingClientRect();
        const containerStyle = getComputedStyle(container);
        const containerBorder = getPositionedStyle(containerStyle, "border", "width");
        const containerPadding = getPositionedStyle(containerStyle, "padding");
        width = rect.width - containerPadding.width - containerBorder.width;
        height = rect.height - containerPadding.height - containerBorder.height;
        maxWidth = parseMaxStyle(containerStyle.maxWidth, container, "clientWidth");
        maxHeight = parseMaxStyle(containerStyle.maxHeight, container, "clientHeight");
      }
    }
    return {
      width,
      height,
      maxWidth: maxWidth || INFINITY,
      maxHeight: maxHeight || INFINITY
    };
  }
  var round1 = (v) => Math.round(v * 10) / 10;
  function getMaximumSize(canvas, bbWidth, bbHeight, aspectRatio) {
    const style = getComputedStyle(canvas);
    const margins = getPositionedStyle(style, "margin");
    const maxWidth = parseMaxStyle(style.maxWidth, canvas, "clientWidth") || INFINITY;
    const maxHeight = parseMaxStyle(style.maxHeight, canvas, "clientHeight") || INFINITY;
    const containerSize = getContainerSize(canvas, bbWidth, bbHeight);
    let { width, height } = containerSize;
    if (style.boxSizing === "content-box") {
      const borders = getPositionedStyle(style, "border", "width");
      const paddings = getPositionedStyle(style, "padding");
      width -= paddings.width + borders.width;
      height -= paddings.height + borders.height;
    }
    width = Math.max(0, width - margins.width);
    height = Math.max(0, aspectRatio ? width / aspectRatio : height - margins.height);
    width = round1(Math.min(width, maxWidth, containerSize.maxWidth));
    height = round1(Math.min(height, maxHeight, containerSize.maxHeight));
    if (width && !height) {
      height = round1(width / 2);
    }
    const maintainHeight = bbWidth !== void 0 || bbHeight !== void 0;
    if (maintainHeight && aspectRatio && containerSize.height && height > containerSize.height) {
      height = containerSize.height;
      width = round1(Math.floor(height * aspectRatio));
    }
    return {
      width,
      height
    };
  }
  function retinaScale(chart, forceRatio, forceStyle) {
    const pixelRatio = forceRatio || 1;
    const deviceHeight = Math.floor(chart.height * pixelRatio);
    const deviceWidth = Math.floor(chart.width * pixelRatio);
    chart.height = Math.floor(chart.height);
    chart.width = Math.floor(chart.width);
    const canvas = chart.canvas;
    if (canvas.style && (forceStyle || !canvas.style.height && !canvas.style.width)) {
      canvas.style.height = `${chart.height}px`;
      canvas.style.width = `${chart.width}px`;
    }
    if (chart.currentDevicePixelRatio !== pixelRatio || canvas.height !== deviceHeight || canvas.width !== deviceWidth) {
      chart.currentDevicePixelRatio = pixelRatio;
      canvas.height = deviceHeight;
      canvas.width = deviceWidth;
      chart.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      return true;
    }
    return false;
  }
  var supportsEventListenerOptions = function() {
    let passiveSupported = false;
    try {
      const options = {
        get passive() {
          passiveSupported = true;
          return false;
        }
      };
      window.addEventListener("test", null, options);
      window.removeEventListener("test", null, options);
    } catch (e) {
    }
    return passiveSupported;
  }();
  function readUsedSize(element, property) {
    const value = getStyle(element, property);
    const matches = value && value.match(/^(\d+)(\.\d+)?px$/);
    return matches ? +matches[1] : void 0;
  }
  function _pointInLine(p1, p2, t, mode) {
    return {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y)
    };
  }
  function _steppedInterpolation(p1, p2, t, mode) {
    return {
      x: p1.x + t * (p2.x - p1.x),
      y: mode === "middle" ? t < 0.5 ? p1.y : p2.y : mode === "after" ? t < 1 ? p1.y : p2.y : t > 0 ? p2.y : p1.y
    };
  }
  function _bezierInterpolation(p1, p2, t, mode) {
    const cp1 = {
      x: p1.cp2x,
      y: p1.cp2y
    };
    const cp2 = {
      x: p2.cp1x,
      y: p2.cp1y
    };
    const a = _pointInLine(p1, cp1, t);
    const b = _pointInLine(cp1, cp2, t);
    const c = _pointInLine(cp2, p2, t);
    const d = _pointInLine(a, b, t);
    const e = _pointInLine(b, c, t);
    return _pointInLine(d, e, t);
  }
  var getRightToLeftAdapter = function(rectX, width) {
    return {
      x(x) {
        return rectX + rectX + width - x;
      },
      setWidth(w) {
        width = w;
      },
      textAlign(align) {
        if (align === "center") {
          return align;
        }
        return align === "right" ? "left" : "right";
      },
      xPlus(x, value) {
        return x - value;
      },
      leftForLtr(x, itemWidth) {
        return x - itemWidth;
      }
    };
  };
  var getLeftToRightAdapter = function() {
    return {
      x(x) {
        return x;
      },
      setWidth(w) {
      },
      textAlign(align) {
        return align;
      },
      xPlus(x, value) {
        return x + value;
      },
      leftForLtr(x, _itemWidth) {
        return x;
      }
    };
  };
  function getRtlAdapter(rtl, rectX, width) {
    return rtl ? getRightToLeftAdapter(rectX, width) : getLeftToRightAdapter();
  }
  function overrideTextDirection(ctx, direction) {
    let style, original;
    if (direction === "ltr" || direction === "rtl") {
      style = ctx.canvas.style;
      original = [
        style.getPropertyValue("direction"),
        style.getPropertyPriority("direction")
      ];
      style.setProperty("direction", direction, "important");
      ctx.prevTextDirection = original;
    }
  }
  function restoreTextDirection(ctx, original) {
    if (original !== void 0) {
      delete ctx.prevTextDirection;
      ctx.canvas.style.setProperty("direction", original[0], original[1]);
    }
  }
  function propertyFn(property) {
    if (property === "angle") {
      return {
        between: _angleBetween,
        compare: _angleDiff,
        normalize: _normalizeAngle
      };
    }
    return {
      between: _isBetween,
      compare: (a, b) => a - b,
      normalize: (x) => x
    };
  }
  function normalizeSegment({ start: start2, end, count, loop, style }) {
    return {
      start: start2 % count,
      end: end % count,
      loop: loop && (end - start2 + 1) % count === 0,
      style
    };
  }
  function getSegment(segment, points, bounds) {
    const { property, start: startBound, end: endBound } = bounds;
    const { between, normalize: normalize2 } = propertyFn(property);
    const count = points.length;
    let { start: start2, end, loop } = segment;
    let i, ilen;
    if (loop) {
      start2 += count;
      end += count;
      for (i = 0, ilen = count; i < ilen; ++i) {
        if (!between(normalize2(points[start2 % count][property]), startBound, endBound)) {
          break;
        }
        start2--;
        end--;
      }
      start2 %= count;
      end %= count;
    }
    if (end < start2) {
      end += count;
    }
    return {
      start: start2,
      end,
      loop,
      style: segment.style
    };
  }
  function _boundSegment(segment, points, bounds) {
    if (!bounds) {
      return [
        segment
      ];
    }
    const { property, start: startBound, end: endBound } = bounds;
    const count = points.length;
    const { compare, between, normalize: normalize2 } = propertyFn(property);
    const { start: start2, end, loop, style } = getSegment(segment, points, bounds);
    const result = [];
    let inside = false;
    let subStart = null;
    let value, point, prevValue;
    const startIsBefore = () => between(startBound, prevValue, value) && compare(startBound, prevValue) !== 0;
    const endIsBefore = () => compare(endBound, value) === 0 || between(endBound, prevValue, value);
    const shouldStart = () => inside || startIsBefore();
    const shouldStop = () => !inside || endIsBefore();
    for (let i = start2, prev = start2; i <= end; ++i) {
      point = points[i % count];
      if (point.skip) {
        continue;
      }
      value = normalize2(point[property]);
      if (value === prevValue) {
        continue;
      }
      inside = between(value, startBound, endBound);
      if (subStart === null && shouldStart()) {
        subStart = compare(value, startBound) === 0 ? i : prev;
      }
      if (subStart !== null && shouldStop()) {
        result.push(normalizeSegment({
          start: subStart,
          end: i,
          loop,
          count,
          style
        }));
        subStart = null;
      }
      prev = i;
      prevValue = value;
    }
    if (subStart !== null) {
      result.push(normalizeSegment({
        start: subStart,
        end,
        loop,
        count,
        style
      }));
    }
    return result;
  }
  function _boundSegments(line, bounds) {
    const result = [];
    const segments = line.segments;
    for (let i = 0; i < segments.length; i++) {
      const sub = _boundSegment(segments[i], line.points, bounds);
      if (sub.length) {
        result.push(...sub);
      }
    }
    return result;
  }
  function findStartAndEnd(points, count, loop, spanGaps) {
    let start2 = 0;
    let end = count - 1;
    if (loop && !spanGaps) {
      while (start2 < count && !points[start2].skip) {
        start2++;
      }
    }
    while (start2 < count && points[start2].skip) {
      start2++;
    }
    start2 %= count;
    if (loop) {
      end += start2;
    }
    while (end > start2 && points[end % count].skip) {
      end--;
    }
    end %= count;
    return {
      start: start2,
      end
    };
  }
  function solidSegments(points, start2, max2, loop) {
    const count = points.length;
    const result = [];
    let last = start2;
    let prev = points[start2];
    let end;
    for (end = start2 + 1; end <= max2; ++end) {
      const cur = points[end % count];
      if (cur.skip || cur.stop) {
        if (!prev.skip) {
          loop = false;
          result.push({
            start: start2 % count,
            end: (end - 1) % count,
            loop
          });
          start2 = last = cur.stop ? end : null;
        }
      } else {
        last = end;
        if (prev.skip) {
          start2 = end;
        }
      }
      prev = cur;
    }
    if (last !== null) {
      result.push({
        start: start2 % count,
        end: last % count,
        loop
      });
    }
    return result;
  }
  function _computeSegments(line, segmentOptions) {
    const points = line.points;
    const spanGaps = line.options.spanGaps;
    const count = points.length;
    if (!count) {
      return [];
    }
    const loop = !!line._loop;
    const { start: start2, end } = findStartAndEnd(points, count, loop, spanGaps);
    if (spanGaps === true) {
      return splitByStyles(line, [
        {
          start: start2,
          end,
          loop
        }
      ], points, segmentOptions);
    }
    const max2 = end < start2 ? end + count : end;
    const completeLoop = !!line._fullLoop && start2 === 0 && end === count - 1;
    return splitByStyles(line, solidSegments(points, start2, max2, completeLoop), points, segmentOptions);
  }
  function splitByStyles(line, segments, points, segmentOptions) {
    if (!segmentOptions || !segmentOptions.setContext || !points) {
      return segments;
    }
    return doSplitByStyles(line, segments, points, segmentOptions);
  }
  function doSplitByStyles(line, segments, points, segmentOptions) {
    const chartContext = line._chart.getContext();
    const baseStyle = readStyle(line.options);
    const { _datasetIndex: datasetIndex, options: { spanGaps } } = line;
    const count = points.length;
    const result = [];
    let prevStyle = baseStyle;
    let start2 = segments[0].start;
    let i = start2;
    function addStyle(s, e, l, st) {
      const dir = spanGaps ? -1 : 1;
      if (s === e) {
        return;
      }
      s += count;
      while (points[s % count].skip) {
        s -= dir;
      }
      while (points[e % count].skip) {
        e += dir;
      }
      if (s % count !== e % count) {
        result.push({
          start: s % count,
          end: e % count,
          loop: l,
          style: st
        });
        prevStyle = st;
        start2 = e % count;
      }
    }
    for (const segment of segments) {
      start2 = spanGaps ? start2 : segment.start;
      let prev = points[start2 % count];
      let style;
      for (i = start2 + 1; i <= segment.end; i++) {
        const pt = points[i % count];
        style = readStyle(segmentOptions.setContext(createContext(chartContext, {
          type: "segment",
          p0: prev,
          p1: pt,
          p0DataIndex: (i - 1) % count,
          p1DataIndex: i % count,
          datasetIndex
        })));
        if (styleChanged(style, prevStyle)) {
          addStyle(start2, i - 1, segment.loop, prevStyle);
        }
        prev = pt;
        prevStyle = style;
      }
      if (start2 < i - 1) {
        addStyle(start2, i - 1, segment.loop, prevStyle);
      }
    }
    return result;
  }
  function readStyle(options) {
    return {
      backgroundColor: options.backgroundColor,
      borderCapStyle: options.borderCapStyle,
      borderDash: options.borderDash,
      borderDashOffset: options.borderDashOffset,
      borderJoinStyle: options.borderJoinStyle,
      borderWidth: options.borderWidth,
      borderColor: options.borderColor
    };
  }
  function styleChanged(style, prevStyle) {
    return prevStyle && JSON.stringify(style) !== JSON.stringify(prevStyle);
  }

  // node_modules/chart.js/dist/chart.js
  var Animator = class {
    constructor() {
      this._request = null;
      this._charts = /* @__PURE__ */ new Map();
      this._running = false;
      this._lastDate = void 0;
    }
    _notify(chart, anims, date, type2) {
      const callbacks = anims.listeners[type2];
      const numSteps = anims.duration;
      callbacks.forEach((fn) => fn({
        chart,
        initial: anims.initial,
        numSteps,
        currentStep: Math.min(date - anims.start, numSteps)
      }));
    }
    _refresh() {
      if (this._request) {
        return;
      }
      this._running = true;
      this._request = requestAnimFrame.call(window, () => {
        this._update();
        this._request = null;
        if (this._running) {
          this._refresh();
        }
      });
    }
    _update(date = Date.now()) {
      let remaining = 0;
      this._charts.forEach((anims, chart) => {
        if (!anims.running || !anims.items.length) {
          return;
        }
        const items = anims.items;
        let i = items.length - 1;
        let draw2 = false;
        let item;
        for (; i >= 0; --i) {
          item = items[i];
          if (item._active) {
            if (item._total > anims.duration) {
              anims.duration = item._total;
            }
            item.tick(date);
            draw2 = true;
          } else {
            items[i] = items[items.length - 1];
            items.pop();
          }
        }
        if (draw2) {
          chart.draw();
          this._notify(chart, anims, date, "progress");
        }
        if (!items.length) {
          anims.running = false;
          this._notify(chart, anims, date, "complete");
          anims.initial = false;
        }
        remaining += items.length;
      });
      this._lastDate = date;
      if (remaining === 0) {
        this._running = false;
      }
    }
    _getAnims(chart) {
      const charts = this._charts;
      let anims = charts.get(chart);
      if (!anims) {
        anims = {
          running: false,
          initial: true,
          items: [],
          listeners: {
            complete: [],
            progress: []
          }
        };
        charts.set(chart, anims);
      }
      return anims;
    }
    listen(chart, event, cb) {
      this._getAnims(chart).listeners[event].push(cb);
    }
    add(chart, items) {
      if (!items || !items.length) {
        return;
      }
      this._getAnims(chart).items.push(...items);
    }
    has(chart) {
      return this._getAnims(chart).items.length > 0;
    }
    start(chart) {
      const anims = this._charts.get(chart);
      if (!anims) {
        return;
      }
      anims.running = true;
      anims.start = Date.now();
      anims.duration = anims.items.reduce((acc, cur) => Math.max(acc, cur._duration), 0);
      this._refresh();
    }
    running(chart) {
      if (!this._running) {
        return false;
      }
      const anims = this._charts.get(chart);
      if (!anims || !anims.running || !anims.items.length) {
        return false;
      }
      return true;
    }
    stop(chart) {
      const anims = this._charts.get(chart);
      if (!anims || !anims.items.length) {
        return;
      }
      const items = anims.items;
      let i = items.length - 1;
      for (; i >= 0; --i) {
        items[i].cancel();
      }
      anims.items = [];
      this._notify(chart, anims, Date.now(), "complete");
    }
    remove(chart) {
      return this._charts.delete(chart);
    }
  };
  var animator = /* @__PURE__ */ new Animator();
  var transparent = "transparent";
  var interpolators = {
    boolean(from2, to2, factor) {
      return factor > 0.5 ? to2 : from2;
    },
    color(from2, to2, factor) {
      const c0 = color2(from2 || transparent);
      const c1 = c0.valid && color2(to2 || transparent);
      return c1 && c1.valid ? c1.mix(c0, factor).hexString() : to2;
    },
    number(from2, to2, factor) {
      return from2 + (to2 - from2) * factor;
    }
  };
  var Animation = class {
    constructor(cfg, target, prop, to2) {
      const currentValue = target[prop];
      to2 = resolve([
        cfg.to,
        to2,
        currentValue,
        cfg.from
      ]);
      const from2 = resolve([
        cfg.from,
        currentValue,
        to2
      ]);
      this._active = true;
      this._fn = cfg.fn || interpolators[cfg.type || typeof from2];
      this._easing = effects[cfg.easing] || effects.linear;
      this._start = Math.floor(Date.now() + (cfg.delay || 0));
      this._duration = this._total = Math.floor(cfg.duration);
      this._loop = !!cfg.loop;
      this._target = target;
      this._prop = prop;
      this._from = from2;
      this._to = to2;
      this._promises = void 0;
    }
    active() {
      return this._active;
    }
    update(cfg, to2, date) {
      if (this._active) {
        this._notify(false);
        const currentValue = this._target[this._prop];
        const elapsed = date - this._start;
        const remain = this._duration - elapsed;
        this._start = date;
        this._duration = Math.floor(Math.max(remain, cfg.duration));
        this._total += elapsed;
        this._loop = !!cfg.loop;
        this._to = resolve([
          cfg.to,
          to2,
          currentValue,
          cfg.from
        ]);
        this._from = resolve([
          cfg.from,
          currentValue,
          to2
        ]);
      }
    }
    cancel() {
      if (this._active) {
        this.tick(Date.now());
        this._active = false;
        this._notify(false);
      }
    }
    tick(date) {
      const elapsed = date - this._start;
      const duration = this._duration;
      const prop = this._prop;
      const from2 = this._from;
      const loop = this._loop;
      const to2 = this._to;
      let factor;
      this._active = from2 !== to2 && (loop || elapsed < duration);
      if (!this._active) {
        this._target[prop] = to2;
        this._notify(true);
        return;
      }
      if (elapsed < 0) {
        this._target[prop] = from2;
        return;
      }
      factor = elapsed / duration % 2;
      factor = loop && factor > 1 ? 2 - factor : factor;
      factor = this._easing(Math.min(1, Math.max(0, factor)));
      this._target[prop] = this._fn(from2, to2, factor);
    }
    wait() {
      const promises = this._promises || (this._promises = []);
      return new Promise((res, rej) => {
        promises.push({
          res,
          rej
        });
      });
    }
    _notify(resolved) {
      const method = resolved ? "res" : "rej";
      const promises = this._promises || [];
      for (let i = 0; i < promises.length; i++) {
        promises[i][method]();
      }
    }
  };
  var Animations = class {
    constructor(chart, config) {
      this._chart = chart;
      this._properties = /* @__PURE__ */ new Map();
      this.configure(config);
    }
    configure(config) {
      if (!isObject(config)) {
        return;
      }
      const animationOptions = Object.keys(defaults.animation);
      const animatedProps = this._properties;
      Object.getOwnPropertyNames(config).forEach((key) => {
        const cfg = config[key];
        if (!isObject(cfg)) {
          return;
        }
        const resolved = {};
        for (const option of animationOptions) {
          resolved[option] = cfg[option];
        }
        (isArray(cfg.properties) && cfg.properties || [
          key
        ]).forEach((prop) => {
          if (prop === key || !animatedProps.has(prop)) {
            animatedProps.set(prop, resolved);
          }
        });
      });
    }
    _animateOptions(target, values) {
      const newOptions = values.options;
      const options = resolveTargetOptions(target, newOptions);
      if (!options) {
        return [];
      }
      const animations = this._createAnimations(options, newOptions);
      if (newOptions.$shared) {
        awaitAll(target.options.$animations, newOptions).then(() => {
          target.options = newOptions;
        }, () => {
        });
      }
      return animations;
    }
    _createAnimations(target, values) {
      const animatedProps = this._properties;
      const animations = [];
      const running = target.$animations || (target.$animations = {});
      const props = Object.keys(values);
      const date = Date.now();
      let i;
      for (i = props.length - 1; i >= 0; --i) {
        const prop = props[i];
        if (prop.charAt(0) === "$") {
          continue;
        }
        if (prop === "options") {
          animations.push(...this._animateOptions(target, values));
          continue;
        }
        const value = values[prop];
        let animation = running[prop];
        const cfg = animatedProps.get(prop);
        if (animation) {
          if (cfg && animation.active()) {
            animation.update(cfg, value, date);
            continue;
          } else {
            animation.cancel();
          }
        }
        if (!cfg || !cfg.duration) {
          target[prop] = value;
          continue;
        }
        running[prop] = animation = new Animation(cfg, target, prop, value);
        animations.push(animation);
      }
      return animations;
    }
    update(target, values) {
      if (this._properties.size === 0) {
        Object.assign(target, values);
        return;
      }
      const animations = this._createAnimations(target, values);
      if (animations.length) {
        animator.add(this._chart, animations);
        return true;
      }
    }
  };
  function awaitAll(animations, properties) {
    const running = [];
    const keys = Object.keys(properties);
    for (let i = 0; i < keys.length; i++) {
      const anim = animations[keys[i]];
      if (anim && anim.active()) {
        running.push(anim.wait());
      }
    }
    return Promise.all(running);
  }
  function resolveTargetOptions(target, newOptions) {
    if (!newOptions) {
      return;
    }
    let options = target.options;
    if (!options) {
      target.options = newOptions;
      return;
    }
    if (options.$shared) {
      target.options = options = Object.assign({}, options, {
        $shared: false,
        $animations: {}
      });
    }
    return options;
  }
  function scaleClip(scale, allowedOverflow) {
    const opts = scale && scale.options || {};
    const reverse = opts.reverse;
    const min2 = opts.min === void 0 ? allowedOverflow : 0;
    const max2 = opts.max === void 0 ? allowedOverflow : 0;
    return {
      start: reverse ? max2 : min2,
      end: reverse ? min2 : max2
    };
  }
  function defaultClip(xScale, yScale, allowedOverflow) {
    if (allowedOverflow === false) {
      return false;
    }
    const x = scaleClip(xScale, allowedOverflow);
    const y = scaleClip(yScale, allowedOverflow);
    return {
      top: y.end,
      right: x.end,
      bottom: y.start,
      left: x.start
    };
  }
  function toClip(value) {
    let t, r, b, l;
    if (isObject(value)) {
      t = value.top;
      r = value.right;
      b = value.bottom;
      l = value.left;
    } else {
      t = r = b = l = value;
    }
    return {
      top: t,
      right: r,
      bottom: b,
      left: l,
      disabled: value === false
    };
  }
  function getSortedDatasetIndices(chart, filterVisible) {
    const keys = [];
    const metasets = chart._getSortedDatasetMetas(filterVisible);
    let i, ilen;
    for (i = 0, ilen = metasets.length; i < ilen; ++i) {
      keys.push(metasets[i].index);
    }
    return keys;
  }
  function applyStack(stack, value, dsIndex, options = {}) {
    const keys = stack.keys;
    const singleMode = options.mode === "single";
    let i, ilen, datasetIndex, otherValue;
    if (value === null) {
      return;
    }
    for (i = 0, ilen = keys.length; i < ilen; ++i) {
      datasetIndex = +keys[i];
      if (datasetIndex === dsIndex) {
        if (options.all) {
          continue;
        }
        break;
      }
      otherValue = stack.values[datasetIndex];
      if (isNumberFinite(otherValue) && (singleMode || value === 0 || sign(value) === sign(otherValue))) {
        value += otherValue;
      }
    }
    return value;
  }
  function convertObjectDataToArray(data) {
    const keys = Object.keys(data);
    const adata = new Array(keys.length);
    let i, ilen, key;
    for (i = 0, ilen = keys.length; i < ilen; ++i) {
      key = keys[i];
      adata[i] = {
        x: key,
        y: data[key]
      };
    }
    return adata;
  }
  function isStacked(scale, meta) {
    const stacked = scale && scale.options.stacked;
    return stacked || stacked === void 0 && meta.stack !== void 0;
  }
  function getStackKey(indexScale, valueScale, meta) {
    return `${indexScale.id}.${valueScale.id}.${meta.stack || meta.type}`;
  }
  function getUserBounds(scale) {
    const { min: min2, max: max2, minDefined, maxDefined } = scale.getUserBounds();
    return {
      min: minDefined ? min2 : Number.NEGATIVE_INFINITY,
      max: maxDefined ? max2 : Number.POSITIVE_INFINITY
    };
  }
  function getOrCreateStack(stacks, stackKey, indexValue) {
    const subStack = stacks[stackKey] || (stacks[stackKey] = {});
    return subStack[indexValue] || (subStack[indexValue] = {});
  }
  function getLastIndexInStack(stack, vScale, positive, type2) {
    for (const meta of vScale.getMatchingVisibleMetas(type2).reverse()) {
      const value = stack[meta.index];
      if (positive && value > 0 || !positive && value < 0) {
        return meta.index;
      }
    }
    return null;
  }
  function updateStacks(controller, parsed) {
    const { chart, _cachedMeta: meta } = controller;
    const stacks = chart._stacks || (chart._stacks = {});
    const { iScale, vScale, index: datasetIndex } = meta;
    const iAxis = iScale.axis;
    const vAxis = vScale.axis;
    const key = getStackKey(iScale, vScale, meta);
    const ilen = parsed.length;
    let stack;
    for (let i = 0; i < ilen; ++i) {
      const item = parsed[i];
      const { [iAxis]: index2, [vAxis]: value } = item;
      const itemStacks = item._stacks || (item._stacks = {});
      stack = itemStacks[vAxis] = getOrCreateStack(stacks, key, index2);
      stack[datasetIndex] = value;
      stack._top = getLastIndexInStack(stack, vScale, true, meta.type);
      stack._bottom = getLastIndexInStack(stack, vScale, false, meta.type);
      const visualValues = stack._visualValues || (stack._visualValues = {});
      visualValues[datasetIndex] = value;
    }
  }
  function getFirstScaleId(chart, axis) {
    const scales2 = chart.scales;
    return Object.keys(scales2).filter((key) => scales2[key].axis === axis).shift();
  }
  function createDatasetContext(parent, index2) {
    return createContext(parent, {
      active: false,
      dataset: void 0,
      datasetIndex: index2,
      index: index2,
      mode: "default",
      type: "dataset"
    });
  }
  function createDataContext(parent, index2, element) {
    return createContext(parent, {
      active: false,
      dataIndex: index2,
      parsed: void 0,
      raw: void 0,
      element,
      index: index2,
      mode: "default",
      type: "data"
    });
  }
  function clearStacks(meta, items) {
    const datasetIndex = meta.controller.index;
    const axis = meta.vScale && meta.vScale.axis;
    if (!axis) {
      return;
    }
    items = items || meta._parsed;
    for (const parsed of items) {
      const stacks = parsed._stacks;
      if (!stacks || stacks[axis] === void 0 || stacks[axis][datasetIndex] === void 0) {
        return;
      }
      delete stacks[axis][datasetIndex];
      if (stacks[axis]._visualValues !== void 0 && stacks[axis]._visualValues[datasetIndex] !== void 0) {
        delete stacks[axis]._visualValues[datasetIndex];
      }
    }
  }
  var isDirectUpdateMode = (mode) => mode === "reset" || mode === "none";
  var cloneIfNotShared = (cached, shared) => shared ? cached : Object.assign({}, cached);
  var createStack = (canStack, meta, chart) => canStack && !meta.hidden && meta._stacked && {
    keys: getSortedDatasetIndices(chart, true),
    values: null
  };
  var DatasetController = class {
    constructor(chart, datasetIndex) {
      this.chart = chart;
      this._ctx = chart.ctx;
      this.index = datasetIndex;
      this._cachedDataOpts = {};
      this._cachedMeta = this.getMeta();
      this._type = this._cachedMeta.type;
      this.options = void 0;
      this._parsing = false;
      this._data = void 0;
      this._objectData = void 0;
      this._sharedOptions = void 0;
      this._drawStart = void 0;
      this._drawCount = void 0;
      this.enableOptionSharing = false;
      this.supportsDecimation = false;
      this.$context = void 0;
      this._syncList = [];
      this.datasetElementType = new.target.datasetElementType;
      this.dataElementType = new.target.dataElementType;
      this.initialize();
    }
    initialize() {
      const meta = this._cachedMeta;
      this.configure();
      this.linkScales();
      meta._stacked = isStacked(meta.vScale, meta);
      this.addElements();
      if (this.options.fill && !this.chart.isPluginEnabled("filler")) {
        console.warn("Tried to use the 'fill' option without the 'Filler' plugin enabled. Please import and register the 'Filler' plugin and make sure it is not disabled in the options");
      }
    }
    updateIndex(datasetIndex) {
      if (this.index !== datasetIndex) {
        clearStacks(this._cachedMeta);
      }
      this.index = datasetIndex;
    }
    linkScales() {
      const chart = this.chart;
      const meta = this._cachedMeta;
      const dataset = this.getDataset();
      const chooseId = (axis, x, y, r) => axis === "x" ? x : axis === "r" ? r : y;
      const xid = meta.xAxisID = valueOrDefault(dataset.xAxisID, getFirstScaleId(chart, "x"));
      const yid = meta.yAxisID = valueOrDefault(dataset.yAxisID, getFirstScaleId(chart, "y"));
      const rid = meta.rAxisID = valueOrDefault(dataset.rAxisID, getFirstScaleId(chart, "r"));
      const indexAxis = meta.indexAxis;
      const iid = meta.iAxisID = chooseId(indexAxis, xid, yid, rid);
      const vid = meta.vAxisID = chooseId(indexAxis, yid, xid, rid);
      meta.xScale = this.getScaleForId(xid);
      meta.yScale = this.getScaleForId(yid);
      meta.rScale = this.getScaleForId(rid);
      meta.iScale = this.getScaleForId(iid);
      meta.vScale = this.getScaleForId(vid);
    }
    getDataset() {
      return this.chart.data.datasets[this.index];
    }
    getMeta() {
      return this.chart.getDatasetMeta(this.index);
    }
    getScaleForId(scaleID) {
      return this.chart.scales[scaleID];
    }
    _getOtherScale(scale) {
      const meta = this._cachedMeta;
      return scale === meta.iScale ? meta.vScale : meta.iScale;
    }
    reset() {
      this._update("reset");
    }
    _destroy() {
      const meta = this._cachedMeta;
      if (this._data) {
        unlistenArrayEvents(this._data, this);
      }
      if (meta._stacked) {
        clearStacks(meta);
      }
    }
    _dataCheck() {
      const dataset = this.getDataset();
      const data = dataset.data || (dataset.data = []);
      const _data = this._data;
      if (isObject(data)) {
        this._data = convertObjectDataToArray(data);
      } else if (_data !== data) {
        if (_data) {
          unlistenArrayEvents(_data, this);
          const meta = this._cachedMeta;
          clearStacks(meta);
          meta._parsed = [];
        }
        if (data && Object.isExtensible(data)) {
          listenArrayEvents(data, this);
        }
        this._syncList = [];
        this._data = data;
      }
    }
    addElements() {
      const meta = this._cachedMeta;
      this._dataCheck();
      if (this.datasetElementType) {
        meta.dataset = new this.datasetElementType();
      }
    }
    buildOrUpdateElements(resetNewElements) {
      const meta = this._cachedMeta;
      const dataset = this.getDataset();
      let stackChanged = false;
      this._dataCheck();
      const oldStacked = meta._stacked;
      meta._stacked = isStacked(meta.vScale, meta);
      if (meta.stack !== dataset.stack) {
        stackChanged = true;
        clearStacks(meta);
        meta.stack = dataset.stack;
      }
      this._resyncElements(resetNewElements);
      if (stackChanged || oldStacked !== meta._stacked) {
        updateStacks(this, meta._parsed);
      }
    }
    configure() {
      const config = this.chart.config;
      const scopeKeys = config.datasetScopeKeys(this._type);
      const scopes = config.getOptionScopes(this.getDataset(), scopeKeys, true);
      this.options = config.createResolver(scopes, this.getContext());
      this._parsing = this.options.parsing;
      this._cachedDataOpts = {};
    }
    parse(start2, count) {
      const { _cachedMeta: meta, _data: data } = this;
      const { iScale, _stacked } = meta;
      const iAxis = iScale.axis;
      let sorted = start2 === 0 && count === data.length ? true : meta._sorted;
      let prev = start2 > 0 && meta._parsed[start2 - 1];
      let i, cur, parsed;
      if (this._parsing === false) {
        meta._parsed = data;
        meta._sorted = true;
        parsed = data;
      } else {
        if (isArray(data[start2])) {
          parsed = this.parseArrayData(meta, data, start2, count);
        } else if (isObject(data[start2])) {
          parsed = this.parseObjectData(meta, data, start2, count);
        } else {
          parsed = this.parsePrimitiveData(meta, data, start2, count);
        }
        const isNotInOrderComparedToPrev = () => cur[iAxis] === null || prev && cur[iAxis] < prev[iAxis];
        for (i = 0; i < count; ++i) {
          meta._parsed[i + start2] = cur = parsed[i];
          if (sorted) {
            if (isNotInOrderComparedToPrev()) {
              sorted = false;
            }
            prev = cur;
          }
        }
        meta._sorted = sorted;
      }
      if (_stacked) {
        updateStacks(this, parsed);
      }
    }
    parsePrimitiveData(meta, data, start2, count) {
      const { iScale, vScale } = meta;
      const iAxis = iScale.axis;
      const vAxis = vScale.axis;
      const labels = iScale.getLabels();
      const singleScale = iScale === vScale;
      const parsed = new Array(count);
      let i, ilen, index2;
      for (i = 0, ilen = count; i < ilen; ++i) {
        index2 = i + start2;
        parsed[i] = {
          [iAxis]: singleScale || iScale.parse(labels[index2], index2),
          [vAxis]: vScale.parse(data[index2], index2)
        };
      }
      return parsed;
    }
    parseArrayData(meta, data, start2, count) {
      const { xScale, yScale } = meta;
      const parsed = new Array(count);
      let i, ilen, index2, item;
      for (i = 0, ilen = count; i < ilen; ++i) {
        index2 = i + start2;
        item = data[index2];
        parsed[i] = {
          x: xScale.parse(item[0], index2),
          y: yScale.parse(item[1], index2)
        };
      }
      return parsed;
    }
    parseObjectData(meta, data, start2, count) {
      const { xScale, yScale } = meta;
      const { xAxisKey = "x", yAxisKey = "y" } = this._parsing;
      const parsed = new Array(count);
      let i, ilen, index2, item;
      for (i = 0, ilen = count; i < ilen; ++i) {
        index2 = i + start2;
        item = data[index2];
        parsed[i] = {
          x: xScale.parse(resolveObjectKey(item, xAxisKey), index2),
          y: yScale.parse(resolveObjectKey(item, yAxisKey), index2)
        };
      }
      return parsed;
    }
    getParsed(index2) {
      return this._cachedMeta._parsed[index2];
    }
    getDataElement(index2) {
      return this._cachedMeta.data[index2];
    }
    applyStack(scale, parsed, mode) {
      const chart = this.chart;
      const meta = this._cachedMeta;
      const value = parsed[scale.axis];
      const stack = {
        keys: getSortedDatasetIndices(chart, true),
        values: parsed._stacks[scale.axis]._visualValues
      };
      return applyStack(stack, value, meta.index, {
        mode
      });
    }
    updateRangeFromParsed(range, scale, parsed, stack) {
      const parsedValue = parsed[scale.axis];
      let value = parsedValue === null ? NaN : parsedValue;
      const values = stack && parsed._stacks[scale.axis];
      if (stack && values) {
        stack.values = values;
        value = applyStack(stack, parsedValue, this._cachedMeta.index);
      }
      range.min = Math.min(range.min, value);
      range.max = Math.max(range.max, value);
    }
    getMinMax(scale, canStack) {
      const meta = this._cachedMeta;
      const _parsed = meta._parsed;
      const sorted = meta._sorted && scale === meta.iScale;
      const ilen = _parsed.length;
      const otherScale = this._getOtherScale(scale);
      const stack = createStack(canStack, meta, this.chart);
      const range = {
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY
      };
      const { min: otherMin, max: otherMax } = getUserBounds(otherScale);
      let i, parsed;
      function _skip() {
        parsed = _parsed[i];
        const otherValue = parsed[otherScale.axis];
        return !isNumberFinite(parsed[scale.axis]) || otherMin > otherValue || otherMax < otherValue;
      }
      for (i = 0; i < ilen; ++i) {
        if (_skip()) {
          continue;
        }
        this.updateRangeFromParsed(range, scale, parsed, stack);
        if (sorted) {
          break;
        }
      }
      if (sorted) {
        for (i = ilen - 1; i >= 0; --i) {
          if (_skip()) {
            continue;
          }
          this.updateRangeFromParsed(range, scale, parsed, stack);
          break;
        }
      }
      return range;
    }
    getAllParsedValues(scale) {
      const parsed = this._cachedMeta._parsed;
      const values = [];
      let i, ilen, value;
      for (i = 0, ilen = parsed.length; i < ilen; ++i) {
        value = parsed[i][scale.axis];
        if (isNumberFinite(value)) {
          values.push(value);
        }
      }
      return values;
    }
    getMaxOverflow() {
      return false;
    }
    getLabelAndValue(index2) {
      const meta = this._cachedMeta;
      const iScale = meta.iScale;
      const vScale = meta.vScale;
      const parsed = this.getParsed(index2);
      return {
        label: iScale ? "" + iScale.getLabelForValue(parsed[iScale.axis]) : "",
        value: vScale ? "" + vScale.getLabelForValue(parsed[vScale.axis]) : ""
      };
    }
    _update(mode) {
      const meta = this._cachedMeta;
      this.update(mode || "default");
      meta._clip = toClip(valueOrDefault(this.options.clip, defaultClip(meta.xScale, meta.yScale, this.getMaxOverflow())));
    }
    update(mode) {
    }
    draw() {
      const ctx = this._ctx;
      const chart = this.chart;
      const meta = this._cachedMeta;
      const elements2 = meta.data || [];
      const area = chart.chartArea;
      const active = [];
      const start2 = this._drawStart || 0;
      const count = this._drawCount || elements2.length - start2;
      const drawActiveElementsOnTop = this.options.drawActiveElementsOnTop;
      let i;
      if (meta.dataset) {
        meta.dataset.draw(ctx, area, start2, count);
      }
      for (i = start2; i < start2 + count; ++i) {
        const element = elements2[i];
        if (element.hidden) {
          continue;
        }
        if (element.active && drawActiveElementsOnTop) {
          active.push(element);
        } else {
          element.draw(ctx, area);
        }
      }
      for (i = 0; i < active.length; ++i) {
        active[i].draw(ctx, area);
      }
    }
    getStyle(index2, active) {
      const mode = active ? "active" : "default";
      return index2 === void 0 && this._cachedMeta.dataset ? this.resolveDatasetElementOptions(mode) : this.resolveDataElementOptions(index2 || 0, mode);
    }
    getContext(index2, active, mode) {
      const dataset = this.getDataset();
      let context;
      if (index2 >= 0 && index2 < this._cachedMeta.data.length) {
        const element = this._cachedMeta.data[index2];
        context = element.$context || (element.$context = createDataContext(this.getContext(), index2, element));
        context.parsed = this.getParsed(index2);
        context.raw = dataset.data[index2];
        context.index = context.dataIndex = index2;
      } else {
        context = this.$context || (this.$context = createDatasetContext(this.chart.getContext(), this.index));
        context.dataset = dataset;
        context.index = context.datasetIndex = this.index;
      }
      context.active = !!active;
      context.mode = mode;
      return context;
    }
    resolveDatasetElementOptions(mode) {
      return this._resolveElementOptions(this.datasetElementType.id, mode);
    }
    resolveDataElementOptions(index2, mode) {
      return this._resolveElementOptions(this.dataElementType.id, mode, index2);
    }
    _resolveElementOptions(elementType, mode = "default", index2) {
      const active = mode === "active";
      const cache = this._cachedDataOpts;
      const cacheKey = elementType + "-" + mode;
      const cached = cache[cacheKey];
      const sharing = this.enableOptionSharing && defined(index2);
      if (cached) {
        return cloneIfNotShared(cached, sharing);
      }
      const config = this.chart.config;
      const scopeKeys = config.datasetElementScopeKeys(this._type, elementType);
      const prefixes2 = active ? [
        `${elementType}Hover`,
        "hover",
        elementType,
        ""
      ] : [
        elementType,
        ""
      ];
      const scopes = config.getOptionScopes(this.getDataset(), scopeKeys);
      const names2 = Object.keys(defaults.elements[elementType]);
      const context = () => this.getContext(index2, active, mode);
      const values = config.resolveNamedOptions(scopes, names2, context, prefixes2);
      if (values.$shared) {
        values.$shared = sharing;
        cache[cacheKey] = Object.freeze(cloneIfNotShared(values, sharing));
      }
      return values;
    }
    _resolveAnimations(index2, transition2, active) {
      const chart = this.chart;
      const cache = this._cachedDataOpts;
      const cacheKey = `animation-${transition2}`;
      const cached = cache[cacheKey];
      if (cached) {
        return cached;
      }
      let options;
      if (chart.options.animation !== false) {
        const config = this.chart.config;
        const scopeKeys = config.datasetAnimationScopeKeys(this._type, transition2);
        const scopes = config.getOptionScopes(this.getDataset(), scopeKeys);
        options = config.createResolver(scopes, this.getContext(index2, active, transition2));
      }
      const animations = new Animations(chart, options && options.animations);
      if (options && options._cacheable) {
        cache[cacheKey] = Object.freeze(animations);
      }
      return animations;
    }
    getSharedOptions(options) {
      if (!options.$shared) {
        return;
      }
      return this._sharedOptions || (this._sharedOptions = Object.assign({}, options));
    }
    includeOptions(mode, sharedOptions) {
      return !sharedOptions || isDirectUpdateMode(mode) || this.chart._animationsDisabled;
    }
    _getSharedOptions(start2, mode) {
      const firstOpts = this.resolveDataElementOptions(start2, mode);
      const previouslySharedOptions = this._sharedOptions;
      const sharedOptions = this.getSharedOptions(firstOpts);
      const includeOptions = this.includeOptions(mode, sharedOptions) || sharedOptions !== previouslySharedOptions;
      this.updateSharedOptions(sharedOptions, mode, firstOpts);
      return {
        sharedOptions,
        includeOptions
      };
    }
    updateElement(element, index2, properties, mode) {
      if (isDirectUpdateMode(mode)) {
        Object.assign(element, properties);
      } else {
        this._resolveAnimations(index2, mode).update(element, properties);
      }
    }
    updateSharedOptions(sharedOptions, mode, newOptions) {
      if (sharedOptions && !isDirectUpdateMode(mode)) {
        this._resolveAnimations(void 0, mode).update(sharedOptions, newOptions);
      }
    }
    _setStyle(element, index2, mode, active) {
      element.active = active;
      const options = this.getStyle(index2, active);
      this._resolveAnimations(index2, mode, active).update(element, {
        options: !active && this.getSharedOptions(options) || options
      });
    }
    removeHoverStyle(element, datasetIndex, index2) {
      this._setStyle(element, index2, "active", false);
    }
    setHoverStyle(element, datasetIndex, index2) {
      this._setStyle(element, index2, "active", true);
    }
    _removeDatasetHoverStyle() {
      const element = this._cachedMeta.dataset;
      if (element) {
        this._setStyle(element, void 0, "active", false);
      }
    }
    _setDatasetHoverStyle() {
      const element = this._cachedMeta.dataset;
      if (element) {
        this._setStyle(element, void 0, "active", true);
      }
    }
    _resyncElements(resetNewElements) {
      const data = this._data;
      const elements2 = this._cachedMeta.data;
      for (const [method, arg1, arg2] of this._syncList) {
        this[method](arg1, arg2);
      }
      this._syncList = [];
      const numMeta = elements2.length;
      const numData = data.length;
      const count = Math.min(numData, numMeta);
      if (count) {
        this.parse(0, count);
      }
      if (numData > numMeta) {
        this._insertElements(numMeta, numData - numMeta, resetNewElements);
      } else if (numData < numMeta) {
        this._removeElements(numData, numMeta - numData);
      }
    }
    _insertElements(start2, count, resetNewElements = true) {
      const meta = this._cachedMeta;
      const data = meta.data;
      const end = start2 + count;
      let i;
      const move = (arr) => {
        arr.length += count;
        for (i = arr.length - 1; i >= end; i--) {
          arr[i] = arr[i - count];
        }
      };
      move(data);
      for (i = start2; i < end; ++i) {
        data[i] = new this.dataElementType();
      }
      if (this._parsing) {
        move(meta._parsed);
      }
      this.parse(start2, count);
      if (resetNewElements) {
        this.updateElements(data, start2, count, "reset");
      }
    }
    updateElements(element, start2, count, mode) {
    }
    _removeElements(start2, count) {
      const meta = this._cachedMeta;
      if (this._parsing) {
        const removed = meta._parsed.splice(start2, count);
        if (meta._stacked) {
          clearStacks(meta, removed);
        }
      }
      meta.data.splice(start2, count);
    }
    _sync(args) {
      if (this._parsing) {
        this._syncList.push(args);
      } else {
        const [method, arg1, arg2] = args;
        this[method](arg1, arg2);
      }
      this.chart._dataChanges.push([
        this.index,
        ...args
      ]);
    }
    _onDataPush() {
      const count = arguments.length;
      this._sync([
        "_insertElements",
        this.getDataset().data.length - count,
        count
      ]);
    }
    _onDataPop() {
      this._sync([
        "_removeElements",
        this._cachedMeta.data.length - 1,
        1
      ]);
    }
    _onDataShift() {
      this._sync([
        "_removeElements",
        0,
        1
      ]);
    }
    _onDataSplice(start2, count) {
      if (count) {
        this._sync([
          "_removeElements",
          start2,
          count
        ]);
      }
      const newCount = arguments.length - 2;
      if (newCount) {
        this._sync([
          "_insertElements",
          start2,
          newCount
        ]);
      }
    }
    _onDataUnshift() {
      this._sync([
        "_insertElements",
        0,
        arguments.length
      ]);
    }
  };
  __publicField(DatasetController, "defaults", {});
  __publicField(DatasetController, "datasetElementType", null);
  __publicField(DatasetController, "dataElementType", null);
  function getAllScaleValues(scale, type2) {
    if (!scale._cache.$bar) {
      const visibleMetas = scale.getMatchingVisibleMetas(type2);
      let values = [];
      for (let i = 0, ilen = visibleMetas.length; i < ilen; i++) {
        values = values.concat(visibleMetas[i].controller.getAllParsedValues(scale));
      }
      scale._cache.$bar = _arrayUnique(values.sort((a, b) => a - b));
    }
    return scale._cache.$bar;
  }
  function computeMinSampleSize(meta) {
    const scale = meta.iScale;
    const values = getAllScaleValues(scale, meta.type);
    let min2 = scale._length;
    let i, ilen, curr, prev;
    const updateMinAndPrev = () => {
      if (curr === 32767 || curr === -32768) {
        return;
      }
      if (defined(prev)) {
        min2 = Math.min(min2, Math.abs(curr - prev) || min2);
      }
      prev = curr;
    };
    for (i = 0, ilen = values.length; i < ilen; ++i) {
      curr = scale.getPixelForValue(values[i]);
      updateMinAndPrev();
    }
    prev = void 0;
    for (i = 0, ilen = scale.ticks.length; i < ilen; ++i) {
      curr = scale.getPixelForTick(i);
      updateMinAndPrev();
    }
    return min2;
  }
  function computeFitCategoryTraits(index2, ruler, options, stackCount) {
    const thickness = options.barThickness;
    let size, ratio;
    if (isNullOrUndef(thickness)) {
      size = ruler.min * options.categoryPercentage;
      ratio = options.barPercentage;
    } else {
      size = thickness * stackCount;
      ratio = 1;
    }
    return {
      chunk: size / stackCount,
      ratio,
      start: ruler.pixels[index2] - size / 2
    };
  }
  function computeFlexCategoryTraits(index2, ruler, options, stackCount) {
    const pixels = ruler.pixels;
    const curr = pixels[index2];
    let prev = index2 > 0 ? pixels[index2 - 1] : null;
    let next = index2 < pixels.length - 1 ? pixels[index2 + 1] : null;
    const percent = options.categoryPercentage;
    if (prev === null) {
      prev = curr - (next === null ? ruler.end - ruler.start : next - curr);
    }
    if (next === null) {
      next = curr + curr - prev;
    }
    const start2 = curr - (curr - Math.min(prev, next)) / 2 * percent;
    const size = Math.abs(next - prev) / 2 * percent;
    return {
      chunk: size / stackCount,
      ratio: options.barPercentage,
      start: start2
    };
  }
  function parseFloatBar(entry, item, vScale, i) {
    const startValue = vScale.parse(entry[0], i);
    const endValue = vScale.parse(entry[1], i);
    const min2 = Math.min(startValue, endValue);
    const max2 = Math.max(startValue, endValue);
    let barStart = min2;
    let barEnd = max2;
    if (Math.abs(min2) > Math.abs(max2)) {
      barStart = max2;
      barEnd = min2;
    }
    item[vScale.axis] = barEnd;
    item._custom = {
      barStart,
      barEnd,
      start: startValue,
      end: endValue,
      min: min2,
      max: max2
    };
  }
  function parseValue(entry, item, vScale, i) {
    if (isArray(entry)) {
      parseFloatBar(entry, item, vScale, i);
    } else {
      item[vScale.axis] = vScale.parse(entry, i);
    }
    return item;
  }
  function parseArrayOrPrimitive(meta, data, start2, count) {
    const iScale = meta.iScale;
    const vScale = meta.vScale;
    const labels = iScale.getLabels();
    const singleScale = iScale === vScale;
    const parsed = [];
    let i, ilen, item, entry;
    for (i = start2, ilen = start2 + count; i < ilen; ++i) {
      entry = data[i];
      item = {};
      item[iScale.axis] = singleScale || iScale.parse(labels[i], i);
      parsed.push(parseValue(entry, item, vScale, i));
    }
    return parsed;
  }
  function isFloatBar(custom) {
    return custom && custom.barStart !== void 0 && custom.barEnd !== void 0;
  }
  function barSign(size, vScale, actualBase) {
    if (size !== 0) {
      return sign(size);
    }
    return (vScale.isHorizontal() ? 1 : -1) * (vScale.min >= actualBase ? 1 : -1);
  }
  function borderProps(properties) {
    let reverse, start2, end, top, bottom;
    if (properties.horizontal) {
      reverse = properties.base > properties.x;
      start2 = "left";
      end = "right";
    } else {
      reverse = properties.base < properties.y;
      start2 = "bottom";
      end = "top";
    }
    if (reverse) {
      top = "end";
      bottom = "start";
    } else {
      top = "start";
      bottom = "end";
    }
    return {
      start: start2,
      end,
      reverse,
      top,
      bottom
    };
  }
  function setBorderSkipped(properties, options, stack, index2) {
    let edge = options.borderSkipped;
    const res = {};
    if (!edge) {
      properties.borderSkipped = res;
      return;
    }
    if (edge === true) {
      properties.borderSkipped = {
        top: true,
        right: true,
        bottom: true,
        left: true
      };
      return;
    }
    const { start: start2, end, reverse, top, bottom } = borderProps(properties);
    if (edge === "middle" && stack) {
      properties.enableBorderRadius = true;
      if ((stack._top || 0) === index2) {
        edge = top;
      } else if ((stack._bottom || 0) === index2) {
        edge = bottom;
      } else {
        res[parseEdge(bottom, start2, end, reverse)] = true;
        edge = top;
      }
    }
    res[parseEdge(edge, start2, end, reverse)] = true;
    properties.borderSkipped = res;
  }
  function parseEdge(edge, a, b, reverse) {
    if (reverse) {
      edge = swap(edge, a, b);
      edge = startEnd(edge, b, a);
    } else {
      edge = startEnd(edge, a, b);
    }
    return edge;
  }
  function swap(orig, v1, v2) {
    return orig === v1 ? v2 : orig === v2 ? v1 : orig;
  }
  function startEnd(v, start2, end) {
    return v === "start" ? start2 : v === "end" ? end : v;
  }
  function setInflateAmount(properties, { inflateAmount }, ratio) {
    properties.inflateAmount = inflateAmount === "auto" ? ratio === 1 ? 0.33 : 0 : inflateAmount;
  }
  var BarController = class extends DatasetController {
    parsePrimitiveData(meta, data, start2, count) {
      return parseArrayOrPrimitive(meta, data, start2, count);
    }
    parseArrayData(meta, data, start2, count) {
      return parseArrayOrPrimitive(meta, data, start2, count);
    }
    parseObjectData(meta, data, start2, count) {
      const { iScale, vScale } = meta;
      const { xAxisKey = "x", yAxisKey = "y" } = this._parsing;
      const iAxisKey = iScale.axis === "x" ? xAxisKey : yAxisKey;
      const vAxisKey = vScale.axis === "x" ? xAxisKey : yAxisKey;
      const parsed = [];
      let i, ilen, item, obj;
      for (i = start2, ilen = start2 + count; i < ilen; ++i) {
        obj = data[i];
        item = {};
        item[iScale.axis] = iScale.parse(resolveObjectKey(obj, iAxisKey), i);
        parsed.push(parseValue(resolveObjectKey(obj, vAxisKey), item, vScale, i));
      }
      return parsed;
    }
    updateRangeFromParsed(range, scale, parsed, stack) {
      super.updateRangeFromParsed(range, scale, parsed, stack);
      const custom = parsed._custom;
      if (custom && scale === this._cachedMeta.vScale) {
        range.min = Math.min(range.min, custom.min);
        range.max = Math.max(range.max, custom.max);
      }
    }
    getMaxOverflow() {
      return 0;
    }
    getLabelAndValue(index2) {
      const meta = this._cachedMeta;
      const { iScale, vScale } = meta;
      const parsed = this.getParsed(index2);
      const custom = parsed._custom;
      const value = isFloatBar(custom) ? "[" + custom.start + ", " + custom.end + "]" : "" + vScale.getLabelForValue(parsed[vScale.axis]);
      return {
        label: "" + iScale.getLabelForValue(parsed[iScale.axis]),
        value
      };
    }
    initialize() {
      this.enableOptionSharing = true;
      super.initialize();
      const meta = this._cachedMeta;
      meta.stack = this.getDataset().stack;
    }
    update(mode) {
      const meta = this._cachedMeta;
      this.updateElements(meta.data, 0, meta.data.length, mode);
    }
    updateElements(bars, start2, count, mode) {
      const reset = mode === "reset";
      const { index: index2, _cachedMeta: { vScale } } = this;
      const base = vScale.getBasePixel();
      const horizontal = vScale.isHorizontal();
      const ruler = this._getRuler();
      const { sharedOptions, includeOptions } = this._getSharedOptions(start2, mode);
      for (let i = start2; i < start2 + count; i++) {
        const parsed = this.getParsed(i);
        const vpixels = reset || isNullOrUndef(parsed[vScale.axis]) ? {
          base,
          head: base
        } : this._calculateBarValuePixels(i);
        const ipixels = this._calculateBarIndexPixels(i, ruler);
        const stack = (parsed._stacks || {})[vScale.axis];
        const properties = {
          horizontal,
          base: vpixels.base,
          enableBorderRadius: !stack || isFloatBar(parsed._custom) || index2 === stack._top || index2 === stack._bottom,
          x: horizontal ? vpixels.head : ipixels.center,
          y: horizontal ? ipixels.center : vpixels.head,
          height: horizontal ? ipixels.size : Math.abs(vpixels.size),
          width: horizontal ? Math.abs(vpixels.size) : ipixels.size
        };
        if (includeOptions) {
          properties.options = sharedOptions || this.resolveDataElementOptions(i, bars[i].active ? "active" : mode);
        }
        const options = properties.options || bars[i].options;
        setBorderSkipped(properties, options, stack, index2);
        setInflateAmount(properties, options, ruler.ratio);
        this.updateElement(bars[i], i, properties, mode);
      }
    }
    _getStacks(last, dataIndex) {
      const { iScale } = this._cachedMeta;
      const metasets = iScale.getMatchingVisibleMetas(this._type).filter((meta) => meta.controller.options.grouped);
      const stacked = iScale.options.stacked;
      const stacks = [];
      const skipNull = (meta) => {
        const parsed = meta.controller.getParsed(dataIndex);
        const val = parsed && parsed[meta.vScale.axis];
        if (isNullOrUndef(val) || isNaN(val)) {
          return true;
        }
      };
      for (const meta of metasets) {
        if (dataIndex !== void 0 && skipNull(meta)) {
          continue;
        }
        if (stacked === false || stacks.indexOf(meta.stack) === -1 || stacked === void 0 && meta.stack === void 0) {
          stacks.push(meta.stack);
        }
        if (meta.index === last) {
          break;
        }
      }
      if (!stacks.length) {
        stacks.push(void 0);
      }
      return stacks;
    }
    _getStackCount(index2) {
      return this._getStacks(void 0, index2).length;
    }
    _getStackIndex(datasetIndex, name2, dataIndex) {
      const stacks = this._getStacks(datasetIndex, dataIndex);
      const index2 = name2 !== void 0 ? stacks.indexOf(name2) : -1;
      return index2 === -1 ? stacks.length - 1 : index2;
    }
    _getRuler() {
      const opts = this.options;
      const meta = this._cachedMeta;
      const iScale = meta.iScale;
      const pixels = [];
      let i, ilen;
      for (i = 0, ilen = meta.data.length; i < ilen; ++i) {
        pixels.push(iScale.getPixelForValue(this.getParsed(i)[iScale.axis], i));
      }
      const barThickness = opts.barThickness;
      const min2 = barThickness || computeMinSampleSize(meta);
      return {
        min: min2,
        pixels,
        start: iScale._startPixel,
        end: iScale._endPixel,
        stackCount: this._getStackCount(),
        scale: iScale,
        grouped: opts.grouped,
        ratio: barThickness ? 1 : opts.categoryPercentage * opts.barPercentage
      };
    }
    _calculateBarValuePixels(index2) {
      const { _cachedMeta: { vScale, _stacked, index: datasetIndex }, options: { base: baseValue, minBarLength } } = this;
      const actualBase = baseValue || 0;
      const parsed = this.getParsed(index2);
      const custom = parsed._custom;
      const floating = isFloatBar(custom);
      let value = parsed[vScale.axis];
      let start2 = 0;
      let length = _stacked ? this.applyStack(vScale, parsed, _stacked) : value;
      let head, size;
      if (length !== value) {
        start2 = length - value;
        length = value;
      }
      if (floating) {
        value = custom.barStart;
        length = custom.barEnd - custom.barStart;
        if (value !== 0 && sign(value) !== sign(custom.barEnd)) {
          start2 = 0;
        }
        start2 += value;
      }
      const startValue = !isNullOrUndef(baseValue) && !floating ? baseValue : start2;
      let base = vScale.getPixelForValue(startValue);
      if (this.chart.getDataVisibility(index2)) {
        head = vScale.getPixelForValue(start2 + length);
      } else {
        head = base;
      }
      size = head - base;
      if (Math.abs(size) < minBarLength) {
        size = barSign(size, vScale, actualBase) * minBarLength;
        if (value === actualBase) {
          base -= size / 2;
        }
        const startPixel = vScale.getPixelForDecimal(0);
        const endPixel = vScale.getPixelForDecimal(1);
        const min2 = Math.min(startPixel, endPixel);
        const max2 = Math.max(startPixel, endPixel);
        base = Math.max(Math.min(base, max2), min2);
        head = base + size;
        if (_stacked && !floating) {
          parsed._stacks[vScale.axis]._visualValues[datasetIndex] = vScale.getValueForPixel(head) - vScale.getValueForPixel(base);
        }
      }
      if (base === vScale.getPixelForValue(actualBase)) {
        const halfGrid = sign(size) * vScale.getLineWidthForValue(actualBase) / 2;
        base += halfGrid;
        size -= halfGrid;
      }
      return {
        size,
        base,
        head,
        center: head + size / 2
      };
    }
    _calculateBarIndexPixels(index2, ruler) {
      const scale = ruler.scale;
      const options = this.options;
      const skipNull = options.skipNull;
      const maxBarThickness = valueOrDefault(options.maxBarThickness, Infinity);
      let center, size;
      if (ruler.grouped) {
        const stackCount = skipNull ? this._getStackCount(index2) : ruler.stackCount;
        const range = options.barThickness === "flex" ? computeFlexCategoryTraits(index2, ruler, options, stackCount) : computeFitCategoryTraits(index2, ruler, options, stackCount);
        const stackIndex = this._getStackIndex(this.index, this._cachedMeta.stack, skipNull ? index2 : void 0);
        center = range.start + range.chunk * stackIndex + range.chunk / 2;
        size = Math.min(maxBarThickness, range.chunk * range.ratio);
      } else {
        center = scale.getPixelForValue(this.getParsed(index2)[scale.axis], index2);
        size = Math.min(maxBarThickness, ruler.min * ruler.ratio);
      }
      return {
        base: center - size / 2,
        head: center + size / 2,
        center,
        size
      };
    }
    draw() {
      const meta = this._cachedMeta;
      const vScale = meta.vScale;
      const rects = meta.data;
      const ilen = rects.length;
      let i = 0;
      for (; i < ilen; ++i) {
        if (this.getParsed(i)[vScale.axis] !== null) {
          rects[i].draw(this._ctx);
        }
      }
    }
  };
  __publicField(BarController, "id", "bar");
  __publicField(BarController, "defaults", {
    datasetElementType: false,
    dataElementType: "bar",
    categoryPercentage: 0.8,
    barPercentage: 0.9,
    grouped: true,
    animations: {
      numbers: {
        type: "number",
        properties: [
          "x",
          "y",
          "base",
          "width",
          "height"
        ]
      }
    }
  });
  __publicField(BarController, "overrides", {
    scales: {
      _index_: {
        type: "category",
        offset: true,
        grid: {
          offset: true
        }
      },
      _value_: {
        type: "linear",
        beginAtZero: true
      }
    }
  });
  var BubbleController = class extends DatasetController {
    initialize() {
      this.enableOptionSharing = true;
      super.initialize();
    }
    parsePrimitiveData(meta, data, start2, count) {
      const parsed = super.parsePrimitiveData(meta, data, start2, count);
      for (let i = 0; i < parsed.length; i++) {
        parsed[i]._custom = this.resolveDataElementOptions(i + start2).radius;
      }
      return parsed;
    }
    parseArrayData(meta, data, start2, count) {
      const parsed = super.parseArrayData(meta, data, start2, count);
      for (let i = 0; i < parsed.length; i++) {
        const item = data[start2 + i];
        parsed[i]._custom = valueOrDefault(item[2], this.resolveDataElementOptions(i + start2).radius);
      }
      return parsed;
    }
    parseObjectData(meta, data, start2, count) {
      const parsed = super.parseObjectData(meta, data, start2, count);
      for (let i = 0; i < parsed.length; i++) {
        const item = data[start2 + i];
        parsed[i]._custom = valueOrDefault(item && item.r && +item.r, this.resolveDataElementOptions(i + start2).radius);
      }
      return parsed;
    }
    getMaxOverflow() {
      const data = this._cachedMeta.data;
      let max2 = 0;
      for (let i = data.length - 1; i >= 0; --i) {
        max2 = Math.max(max2, data[i].size(this.resolveDataElementOptions(i)) / 2);
      }
      return max2 > 0 && max2;
    }
    getLabelAndValue(index2) {
      const meta = this._cachedMeta;
      const labels = this.chart.data.labels || [];
      const { xScale, yScale } = meta;
      const parsed = this.getParsed(index2);
      const x = xScale.getLabelForValue(parsed.x);
      const y = yScale.getLabelForValue(parsed.y);
      const r = parsed._custom;
      return {
        label: labels[index2] || "",
        value: "(" + x + ", " + y + (r ? ", " + r : "") + ")"
      };
    }
    update(mode) {
      const points = this._cachedMeta.data;
      this.updateElements(points, 0, points.length, mode);
    }
    updateElements(points, start2, count, mode) {
      const reset = mode === "reset";
      const { iScale, vScale } = this._cachedMeta;
      const { sharedOptions, includeOptions } = this._getSharedOptions(start2, mode);
      const iAxis = iScale.axis;
      const vAxis = vScale.axis;
      for (let i = start2; i < start2 + count; i++) {
        const point = points[i];
        const parsed = !reset && this.getParsed(i);
        const properties = {};
        const iPixel = properties[iAxis] = reset ? iScale.getPixelForDecimal(0.5) : iScale.getPixelForValue(parsed[iAxis]);
        const vPixel = properties[vAxis] = reset ? vScale.getBasePixel() : vScale.getPixelForValue(parsed[vAxis]);
        properties.skip = isNaN(iPixel) || isNaN(vPixel);
        if (includeOptions) {
          properties.options = sharedOptions || this.resolveDataElementOptions(i, point.active ? "active" : mode);
          if (reset) {
            properties.options.radius = 0;
          }
        }
        this.updateElement(point, i, properties, mode);
      }
    }
    resolveDataElementOptions(index2, mode) {
      const parsed = this.getParsed(index2);
      let values = super.resolveDataElementOptions(index2, mode);
      if (values.$shared) {
        values = Object.assign({}, values, {
          $shared: false
        });
      }
      const radius = values.radius;
      if (mode !== "active") {
        values.radius = 0;
      }
      values.radius += valueOrDefault(parsed && parsed._custom, radius);
      return values;
    }
  };
  __publicField(BubbleController, "id", "bubble");
  __publicField(BubbleController, "defaults", {
    datasetElementType: false,
    dataElementType: "point",
    animations: {
      numbers: {
        type: "number",
        properties: [
          "x",
          "y",
          "borderWidth",
          "radius"
        ]
      }
    }
  });
  __publicField(BubbleController, "overrides", {
    scales: {
      x: {
        type: "linear"
      },
      y: {
        type: "linear"
      }
    }
  });
  function getRatioAndOffset(rotation, circumference, cutout) {
    let ratioX = 1;
    let ratioY = 1;
    let offsetX = 0;
    let offsetY = 0;
    if (circumference < TAU) {
      const startAngle = rotation;
      const endAngle = startAngle + circumference;
      const startX = Math.cos(startAngle);
      const startY = Math.sin(startAngle);
      const endX = Math.cos(endAngle);
      const endY = Math.sin(endAngle);
      const calcMax = (angle, a, b) => _angleBetween(angle, startAngle, endAngle, true) ? 1 : Math.max(a, a * cutout, b, b * cutout);
      const calcMin = (angle, a, b) => _angleBetween(angle, startAngle, endAngle, true) ? -1 : Math.min(a, a * cutout, b, b * cutout);
      const maxX = calcMax(0, startX, endX);
      const maxY = calcMax(HALF_PI, startY, endY);
      const minX = calcMin(PI, startX, endX);
      const minY = calcMin(PI + HALF_PI, startY, endY);
      ratioX = (maxX - minX) / 2;
      ratioY = (maxY - minY) / 2;
      offsetX = -(maxX + minX) / 2;
      offsetY = -(maxY + minY) / 2;
    }
    return {
      ratioX,
      ratioY,
      offsetX,
      offsetY
    };
  }
  var DoughnutController = class extends DatasetController {
    constructor(chart, datasetIndex) {
      super(chart, datasetIndex);
      this.enableOptionSharing = true;
      this.innerRadius = void 0;
      this.outerRadius = void 0;
      this.offsetX = void 0;
      this.offsetY = void 0;
    }
    linkScales() {
    }
    parse(start2, count) {
      const data = this.getDataset().data;
      const meta = this._cachedMeta;
      if (this._parsing === false) {
        meta._parsed = data;
      } else {
        let getter = (i2) => +data[i2];
        if (isObject(data[start2])) {
          const { key = "value" } = this._parsing;
          getter = (i2) => +resolveObjectKey(data[i2], key);
        }
        let i, ilen;
        for (i = start2, ilen = start2 + count; i < ilen; ++i) {
          meta._parsed[i] = getter(i);
        }
      }
    }
    _getRotation() {
      return toRadians(this.options.rotation - 90);
    }
    _getCircumference() {
      return toRadians(this.options.circumference);
    }
    _getRotationExtents() {
      let min2 = TAU;
      let max2 = -TAU;
      for (let i = 0; i < this.chart.data.datasets.length; ++i) {
        if (this.chart.isDatasetVisible(i) && this.chart.getDatasetMeta(i).type === this._type) {
          const controller = this.chart.getDatasetMeta(i).controller;
          const rotation = controller._getRotation();
          const circumference = controller._getCircumference();
          min2 = Math.min(min2, rotation);
          max2 = Math.max(max2, rotation + circumference);
        }
      }
      return {
        rotation: min2,
        circumference: max2 - min2
      };
    }
    update(mode) {
      const chart = this.chart;
      const { chartArea } = chart;
      const meta = this._cachedMeta;
      const arcs = meta.data;
      const spacing = this.getMaxBorderWidth() + this.getMaxOffset(arcs) + this.options.spacing;
      const maxSize = Math.max((Math.min(chartArea.width, chartArea.height) - spacing) / 2, 0);
      const cutout = Math.min(toPercentage(this.options.cutout, maxSize), 1);
      const chartWeight = this._getRingWeight(this.index);
      const { circumference, rotation } = this._getRotationExtents();
      const { ratioX, ratioY, offsetX, offsetY } = getRatioAndOffset(rotation, circumference, cutout);
      const maxWidth = (chartArea.width - spacing) / ratioX;
      const maxHeight = (chartArea.height - spacing) / ratioY;
      const maxRadius = Math.max(Math.min(maxWidth, maxHeight) / 2, 0);
      const outerRadius = toDimension(this.options.radius, maxRadius);
      const innerRadius = Math.max(outerRadius * cutout, 0);
      const radiusLength = (outerRadius - innerRadius) / this._getVisibleDatasetWeightTotal();
      this.offsetX = offsetX * outerRadius;
      this.offsetY = offsetY * outerRadius;
      meta.total = this.calculateTotal();
      this.outerRadius = outerRadius - radiusLength * this._getRingWeightOffset(this.index);
      this.innerRadius = Math.max(this.outerRadius - radiusLength * chartWeight, 0);
      this.updateElements(arcs, 0, arcs.length, mode);
    }
    _circumference(i, reset) {
      const opts = this.options;
      const meta = this._cachedMeta;
      const circumference = this._getCircumference();
      if (reset && opts.animation.animateRotate || !this.chart.getDataVisibility(i) || meta._parsed[i] === null || meta.data[i].hidden) {
        return 0;
      }
      return this.calculateCircumference(meta._parsed[i] * circumference / TAU);
    }
    updateElements(arcs, start2, count, mode) {
      const reset = mode === "reset";
      const chart = this.chart;
      const chartArea = chart.chartArea;
      const opts = chart.options;
      const animationOpts = opts.animation;
      const centerX = (chartArea.left + chartArea.right) / 2;
      const centerY = (chartArea.top + chartArea.bottom) / 2;
      const animateScale = reset && animationOpts.animateScale;
      const innerRadius = animateScale ? 0 : this.innerRadius;
      const outerRadius = animateScale ? 0 : this.outerRadius;
      const { sharedOptions, includeOptions } = this._getSharedOptions(start2, mode);
      let startAngle = this._getRotation();
      let i;
      for (i = 0; i < start2; ++i) {
        startAngle += this._circumference(i, reset);
      }
      for (i = start2; i < start2 + count; ++i) {
        const circumference = this._circumference(i, reset);
        const arc = arcs[i];
        const properties = {
          x: centerX + this.offsetX,
          y: centerY + this.offsetY,
          startAngle,
          endAngle: startAngle + circumference,
          circumference,
          outerRadius,
          innerRadius
        };
        if (includeOptions) {
          properties.options = sharedOptions || this.resolveDataElementOptions(i, arc.active ? "active" : mode);
        }
        startAngle += circumference;
        this.updateElement(arc, i, properties, mode);
      }
    }
    calculateTotal() {
      const meta = this._cachedMeta;
      const metaData = meta.data;
      let total = 0;
      let i;
      for (i = 0; i < metaData.length; i++) {
        const value = meta._parsed[i];
        if (value !== null && !isNaN(value) && this.chart.getDataVisibility(i) && !metaData[i].hidden) {
          total += Math.abs(value);
        }
      }
      return total;
    }
    calculateCircumference(value) {
      const total = this._cachedMeta.total;
      if (total > 0 && !isNaN(value)) {
        return TAU * (Math.abs(value) / total);
      }
      return 0;
    }
    getLabelAndValue(index2) {
      const meta = this._cachedMeta;
      const chart = this.chart;
      const labels = chart.data.labels || [];
      const value = formatNumber(meta._parsed[index2], chart.options.locale);
      return {
        label: labels[index2] || "",
        value
      };
    }
    getMaxBorderWidth(arcs) {
      let max2 = 0;
      const chart = this.chart;
      let i, ilen, meta, controller, options;
      if (!arcs) {
        for (i = 0, ilen = chart.data.datasets.length; i < ilen; ++i) {
          if (chart.isDatasetVisible(i)) {
            meta = chart.getDatasetMeta(i);
            arcs = meta.data;
            controller = meta.controller;
            break;
          }
        }
      }
      if (!arcs) {
        return 0;
      }
      for (i = 0, ilen = arcs.length; i < ilen; ++i) {
        options = controller.resolveDataElementOptions(i);
        if (options.borderAlign !== "inner") {
          max2 = Math.max(max2, options.borderWidth || 0, options.hoverBorderWidth || 0);
        }
      }
      return max2;
    }
    getMaxOffset(arcs) {
      let max2 = 0;
      for (let i = 0, ilen = arcs.length; i < ilen; ++i) {
        const options = this.resolveDataElementOptions(i);
        max2 = Math.max(max2, options.offset || 0, options.hoverOffset || 0);
      }
      return max2;
    }
    _getRingWeightOffset(datasetIndex) {
      let ringWeightOffset = 0;
      for (let i = 0; i < datasetIndex; ++i) {
        if (this.chart.isDatasetVisible(i)) {
          ringWeightOffset += this._getRingWeight(i);
        }
      }
      return ringWeightOffset;
    }
    _getRingWeight(datasetIndex) {
      return Math.max(valueOrDefault(this.chart.data.datasets[datasetIndex].weight, 1), 0);
    }
    _getVisibleDatasetWeightTotal() {
      return this._getRingWeightOffset(this.chart.data.datasets.length) || 1;
    }
  };
  __publicField(DoughnutController, "id", "doughnut");
  __publicField(DoughnutController, "defaults", {
    datasetElementType: false,
    dataElementType: "arc",
    animation: {
      animateRotate: true,
      animateScale: false
    },
    animations: {
      numbers: {
        type: "number",
        properties: [
          "circumference",
          "endAngle",
          "innerRadius",
          "outerRadius",
          "startAngle",
          "x",
          "y",
          "offset",
          "borderWidth",
          "spacing"
        ]
      }
    },
    cutout: "50%",
    rotation: 0,
    circumference: 360,
    radius: "100%",
    spacing: 0,
    indexAxis: "r"
  });
  __publicField(DoughnutController, "descriptors", {
    _scriptable: (name2) => name2 !== "spacing",
    _indexable: (name2) => name2 !== "spacing"
  });
  __publicField(DoughnutController, "overrides", {
    aspectRatio: 1,
    plugins: {
      legend: {
        labels: {
          generateLabels(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              const { labels: { pointStyle, color: color3 } } = chart.legend.options;
              return data.labels.map((label, i) => {
                const meta = chart.getDatasetMeta(0);
                const style = meta.controller.getStyle(i);
                return {
                  text: label,
                  fillStyle: style.backgroundColor,
                  strokeStyle: style.borderColor,
                  fontColor: color3,
                  lineWidth: style.borderWidth,
                  pointStyle,
                  hidden: !chart.getDataVisibility(i),
                  index: i
                };
              });
            }
            return [];
          }
        },
        onClick(e, legendItem, legend) {
          legend.chart.toggleDataVisibility(legendItem.index);
          legend.chart.update();
        }
      }
    }
  });
  var LineController = class extends DatasetController {
    initialize() {
      this.enableOptionSharing = true;
      this.supportsDecimation = true;
      super.initialize();
    }
    update(mode) {
      const meta = this._cachedMeta;
      const { dataset: line, data: points = [], _dataset } = meta;
      const animationsDisabled = this.chart._animationsDisabled;
      let { start: start2, count } = _getStartAndCountOfVisiblePoints(meta, points, animationsDisabled);
      this._drawStart = start2;
      this._drawCount = count;
      if (_scaleRangesChanged(meta)) {
        start2 = 0;
        count = points.length;
      }
      line._chart = this.chart;
      line._datasetIndex = this.index;
      line._decimated = !!_dataset._decimated;
      line.points = points;
      const options = this.resolveDatasetElementOptions(mode);
      if (!this.options.showLine) {
        options.borderWidth = 0;
      }
      options.segment = this.options.segment;
      this.updateElement(line, void 0, {
        animated: !animationsDisabled,
        options
      }, mode);
      this.updateElements(points, start2, count, mode);
    }
    updateElements(points, start2, count, mode) {
      const reset = mode === "reset";
      const { iScale, vScale, _stacked, _dataset } = this._cachedMeta;
      const { sharedOptions, includeOptions } = this._getSharedOptions(start2, mode);
      const iAxis = iScale.axis;
      const vAxis = vScale.axis;
      const { spanGaps, segment } = this.options;
      const maxGapLength = isNumber(spanGaps) ? spanGaps : Number.POSITIVE_INFINITY;
      const directUpdate = this.chart._animationsDisabled || reset || mode === "none";
      const end = start2 + count;
      const pointsCount = points.length;
      let prevParsed = start2 > 0 && this.getParsed(start2 - 1);
      for (let i = 0; i < pointsCount; ++i) {
        const point = points[i];
        const properties = directUpdate ? point : {};
        if (i < start2 || i >= end) {
          properties.skip = true;
          continue;
        }
        const parsed = this.getParsed(i);
        const nullData = isNullOrUndef(parsed[vAxis]);
        const iPixel = properties[iAxis] = iScale.getPixelForValue(parsed[iAxis], i);
        const vPixel = properties[vAxis] = reset || nullData ? vScale.getBasePixel() : vScale.getPixelForValue(_stacked ? this.applyStack(vScale, parsed, _stacked) : parsed[vAxis], i);
        properties.skip = isNaN(iPixel) || isNaN(vPixel) || nullData;
        properties.stop = i > 0 && Math.abs(parsed[iAxis] - prevParsed[iAxis]) > maxGapLength;
        if (segment) {
          properties.parsed = parsed;
          properties.raw = _dataset.data[i];
        }
        if (includeOptions) {
          properties.options = sharedOptions || this.resolveDataElementOptions(i, point.active ? "active" : mode);
        }
        if (!directUpdate) {
          this.updateElement(point, i, properties, mode);
        }
        prevParsed = parsed;
      }
    }
    getMaxOverflow() {
      const meta = this._cachedMeta;
      const dataset = meta.dataset;
      const border = dataset.options && dataset.options.borderWidth || 0;
      const data = meta.data || [];
      if (!data.length) {
        return border;
      }
      const firstPoint = data[0].size(this.resolveDataElementOptions(0));
      const lastPoint = data[data.length - 1].size(this.resolveDataElementOptions(data.length - 1));
      return Math.max(border, firstPoint, lastPoint) / 2;
    }
    draw() {
      const meta = this._cachedMeta;
      meta.dataset.updateControlPoints(this.chart.chartArea, meta.iScale.axis);
      super.draw();
    }
  };
  __publicField(LineController, "id", "line");
  __publicField(LineController, "defaults", {
    datasetElementType: "line",
    dataElementType: "point",
    showLine: true,
    spanGaps: false
  });
  __publicField(LineController, "overrides", {
    scales: {
      _index_: {
        type: "category"
      },
      _value_: {
        type: "linear"
      }
    }
  });
  var PolarAreaController = class extends DatasetController {
    constructor(chart, datasetIndex) {
      super(chart, datasetIndex);
      this.innerRadius = void 0;
      this.outerRadius = void 0;
    }
    getLabelAndValue(index2) {
      const meta = this._cachedMeta;
      const chart = this.chart;
      const labels = chart.data.labels || [];
      const value = formatNumber(meta._parsed[index2].r, chart.options.locale);
      return {
        label: labels[index2] || "",
        value
      };
    }
    parseObjectData(meta, data, start2, count) {
      return _parseObjectDataRadialScale.bind(this)(meta, data, start2, count);
    }
    update(mode) {
      const arcs = this._cachedMeta.data;
      this._updateRadius();
      this.updateElements(arcs, 0, arcs.length, mode);
    }
    getMinMax() {
      const meta = this._cachedMeta;
      const range = {
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY
      };
      meta.data.forEach((element, index2) => {
        const parsed = this.getParsed(index2).r;
        if (!isNaN(parsed) && this.chart.getDataVisibility(index2)) {
          if (parsed < range.min) {
            range.min = parsed;
          }
          if (parsed > range.max) {
            range.max = parsed;
          }
        }
      });
      return range;
    }
    _updateRadius() {
      const chart = this.chart;
      const chartArea = chart.chartArea;
      const opts = chart.options;
      const minSize = Math.min(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
      const outerRadius = Math.max(minSize / 2, 0);
      const innerRadius = Math.max(opts.cutoutPercentage ? outerRadius / 100 * opts.cutoutPercentage : 1, 0);
      const radiusLength = (outerRadius - innerRadius) / chart.getVisibleDatasetCount();
      this.outerRadius = outerRadius - radiusLength * this.index;
      this.innerRadius = this.outerRadius - radiusLength;
    }
    updateElements(arcs, start2, count, mode) {
      const reset = mode === "reset";
      const chart = this.chart;
      const opts = chart.options;
      const animationOpts = opts.animation;
      const scale = this._cachedMeta.rScale;
      const centerX = scale.xCenter;
      const centerY = scale.yCenter;
      const datasetStartAngle = scale.getIndexAngle(0) - 0.5 * PI;
      let angle = datasetStartAngle;
      let i;
      const defaultAngle = 360 / this.countVisibleElements();
      for (i = 0; i < start2; ++i) {
        angle += this._computeAngle(i, mode, defaultAngle);
      }
      for (i = start2; i < start2 + count; i++) {
        const arc = arcs[i];
        let startAngle = angle;
        let endAngle = angle + this._computeAngle(i, mode, defaultAngle);
        let outerRadius = chart.getDataVisibility(i) ? scale.getDistanceFromCenterForValue(this.getParsed(i).r) : 0;
        angle = endAngle;
        if (reset) {
          if (animationOpts.animateScale) {
            outerRadius = 0;
          }
          if (animationOpts.animateRotate) {
            startAngle = endAngle = datasetStartAngle;
          }
        }
        const properties = {
          x: centerX,
          y: centerY,
          innerRadius: 0,
          outerRadius,
          startAngle,
          endAngle,
          options: this.resolveDataElementOptions(i, arc.active ? "active" : mode)
        };
        this.updateElement(arc, i, properties, mode);
      }
    }
    countVisibleElements() {
      const meta = this._cachedMeta;
      let count = 0;
      meta.data.forEach((element, index2) => {
        if (!isNaN(this.getParsed(index2).r) && this.chart.getDataVisibility(index2)) {
          count++;
        }
      });
      return count;
    }
    _computeAngle(index2, mode, defaultAngle) {
      return this.chart.getDataVisibility(index2) ? toRadians(this.resolveDataElementOptions(index2, mode).angle || defaultAngle) : 0;
    }
  };
  __publicField(PolarAreaController, "id", "polarArea");
  __publicField(PolarAreaController, "defaults", {
    dataElementType: "arc",
    animation: {
      animateRotate: true,
      animateScale: true
    },
    animations: {
      numbers: {
        type: "number",
        properties: [
          "x",
          "y",
          "startAngle",
          "endAngle",
          "innerRadius",
          "outerRadius"
        ]
      }
    },
    indexAxis: "r",
    startAngle: 0
  });
  __publicField(PolarAreaController, "overrides", {
    aspectRatio: 1,
    plugins: {
      legend: {
        labels: {
          generateLabels(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              const { labels: { pointStyle, color: color3 } } = chart.legend.options;
              return data.labels.map((label, i) => {
                const meta = chart.getDatasetMeta(0);
                const style = meta.controller.getStyle(i);
                return {
                  text: label,
                  fillStyle: style.backgroundColor,
                  strokeStyle: style.borderColor,
                  fontColor: color3,
                  lineWidth: style.borderWidth,
                  pointStyle,
                  hidden: !chart.getDataVisibility(i),
                  index: i
                };
              });
            }
            return [];
          }
        },
        onClick(e, legendItem, legend) {
          legend.chart.toggleDataVisibility(legendItem.index);
          legend.chart.update();
        }
      }
    },
    scales: {
      r: {
        type: "radialLinear",
        angleLines: {
          display: false
        },
        beginAtZero: true,
        grid: {
          circular: true
        },
        pointLabels: {
          display: false
        },
        startAngle: 0
      }
    }
  });
  var PieController = class extends DoughnutController {
  };
  __publicField(PieController, "id", "pie");
  __publicField(PieController, "defaults", {
    cutout: 0,
    rotation: 0,
    circumference: 360,
    radius: "100%"
  });
  var RadarController = class extends DatasetController {
    getLabelAndValue(index2) {
      const vScale = this._cachedMeta.vScale;
      const parsed = this.getParsed(index2);
      return {
        label: vScale.getLabels()[index2],
        value: "" + vScale.getLabelForValue(parsed[vScale.axis])
      };
    }
    parseObjectData(meta, data, start2, count) {
      return _parseObjectDataRadialScale.bind(this)(meta, data, start2, count);
    }
    update(mode) {
      const meta = this._cachedMeta;
      const line = meta.dataset;
      const points = meta.data || [];
      const labels = meta.iScale.getLabels();
      line.points = points;
      if (mode !== "resize") {
        const options = this.resolveDatasetElementOptions(mode);
        if (!this.options.showLine) {
          options.borderWidth = 0;
        }
        const properties = {
          _loop: true,
          _fullLoop: labels.length === points.length,
          options
        };
        this.updateElement(line, void 0, properties, mode);
      }
      this.updateElements(points, 0, points.length, mode);
    }
    updateElements(points, start2, count, mode) {
      const scale = this._cachedMeta.rScale;
      const reset = mode === "reset";
      for (let i = start2; i < start2 + count; i++) {
        const point = points[i];
        const options = this.resolveDataElementOptions(i, point.active ? "active" : mode);
        const pointPosition = scale.getPointPositionForValue(i, this.getParsed(i).r);
        const x = reset ? scale.xCenter : pointPosition.x;
        const y = reset ? scale.yCenter : pointPosition.y;
        const properties = {
          x,
          y,
          angle: pointPosition.angle,
          skip: isNaN(x) || isNaN(y),
          options
        };
        this.updateElement(point, i, properties, mode);
      }
    }
  };
  __publicField(RadarController, "id", "radar");
  __publicField(RadarController, "defaults", {
    datasetElementType: "line",
    dataElementType: "point",
    indexAxis: "r",
    showLine: true,
    elements: {
      line: {
        fill: "start"
      }
    }
  });
  __publicField(RadarController, "overrides", {
    aspectRatio: 1,
    scales: {
      r: {
        type: "radialLinear"
      }
    }
  });
  var ScatterController = class extends DatasetController {
    getLabelAndValue(index2) {
      const meta = this._cachedMeta;
      const labels = this.chart.data.labels || [];
      const { xScale, yScale } = meta;
      const parsed = this.getParsed(index2);
      const x = xScale.getLabelForValue(parsed.x);
      const y = yScale.getLabelForValue(parsed.y);
      return {
        label: labels[index2] || "",
        value: "(" + x + ", " + y + ")"
      };
    }
    update(mode) {
      const meta = this._cachedMeta;
      const { data: points = [] } = meta;
      const animationsDisabled = this.chart._animationsDisabled;
      let { start: start2, count } = _getStartAndCountOfVisiblePoints(meta, points, animationsDisabled);
      this._drawStart = start2;
      this._drawCount = count;
      if (_scaleRangesChanged(meta)) {
        start2 = 0;
        count = points.length;
      }
      if (this.options.showLine) {
        const { dataset: line, _dataset } = meta;
        line._chart = this.chart;
        line._datasetIndex = this.index;
        line._decimated = !!_dataset._decimated;
        line.points = points;
        const options = this.resolveDatasetElementOptions(mode);
        options.segment = this.options.segment;
        this.updateElement(line, void 0, {
          animated: !animationsDisabled,
          options
        }, mode);
      }
      this.updateElements(points, start2, count, mode);
    }
    addElements() {
      const { showLine } = this.options;
      if (!this.datasetElementType && showLine) {
        this.datasetElementType = this.chart.registry.getElement("line");
      }
      super.addElements();
    }
    updateElements(points, start2, count, mode) {
      const reset = mode === "reset";
      const { iScale, vScale, _stacked, _dataset } = this._cachedMeta;
      const firstOpts = this.resolveDataElementOptions(start2, mode);
      const sharedOptions = this.getSharedOptions(firstOpts);
      const includeOptions = this.includeOptions(mode, sharedOptions);
      const iAxis = iScale.axis;
      const vAxis = vScale.axis;
      const { spanGaps, segment } = this.options;
      const maxGapLength = isNumber(spanGaps) ? spanGaps : Number.POSITIVE_INFINITY;
      const directUpdate = this.chart._animationsDisabled || reset || mode === "none";
      let prevParsed = start2 > 0 && this.getParsed(start2 - 1);
      for (let i = start2; i < start2 + count; ++i) {
        const point = points[i];
        const parsed = this.getParsed(i);
        const properties = directUpdate ? point : {};
        const nullData = isNullOrUndef(parsed[vAxis]);
        const iPixel = properties[iAxis] = iScale.getPixelForValue(parsed[iAxis], i);
        const vPixel = properties[vAxis] = reset || nullData ? vScale.getBasePixel() : vScale.getPixelForValue(_stacked ? this.applyStack(vScale, parsed, _stacked) : parsed[vAxis], i);
        properties.skip = isNaN(iPixel) || isNaN(vPixel) || nullData;
        properties.stop = i > 0 && Math.abs(parsed[iAxis] - prevParsed[iAxis]) > maxGapLength;
        if (segment) {
          properties.parsed = parsed;
          properties.raw = _dataset.data[i];
        }
        if (includeOptions) {
          properties.options = sharedOptions || this.resolveDataElementOptions(i, point.active ? "active" : mode);
        }
        if (!directUpdate) {
          this.updateElement(point, i, properties, mode);
        }
        prevParsed = parsed;
      }
      this.updateSharedOptions(sharedOptions, mode, firstOpts);
    }
    getMaxOverflow() {
      const meta = this._cachedMeta;
      const data = meta.data || [];
      if (!this.options.showLine) {
        let max2 = 0;
        for (let i = data.length - 1; i >= 0; --i) {
          max2 = Math.max(max2, data[i].size(this.resolveDataElementOptions(i)) / 2);
        }
        return max2 > 0 && max2;
      }
      const dataset = meta.dataset;
      const border = dataset.options && dataset.options.borderWidth || 0;
      if (!data.length) {
        return border;
      }
      const firstPoint = data[0].size(this.resolveDataElementOptions(0));
      const lastPoint = data[data.length - 1].size(this.resolveDataElementOptions(data.length - 1));
      return Math.max(border, firstPoint, lastPoint) / 2;
    }
  };
  __publicField(ScatterController, "id", "scatter");
  __publicField(ScatterController, "defaults", {
    datasetElementType: false,
    dataElementType: "point",
    showLine: false,
    fill: false
  });
  __publicField(ScatterController, "overrides", {
    interaction: {
      mode: "point"
    },
    scales: {
      x: {
        type: "linear"
      },
      y: {
        type: "linear"
      }
    }
  });
  var controllers = /* @__PURE__ */ Object.freeze({
    __proto__: null,
    BarController,
    BubbleController,
    DoughnutController,
    LineController,
    PolarAreaController,
    PieController,
    RadarController,
    ScatterController
  });
  function abstract() {
    throw new Error("This method is not implemented: Check that a complete date adapter is provided.");
  }
  var DateAdapterBase = class {
    /**
    * Override default date adapter methods.
    * Accepts type parameter to define options type.
    * @example
    * Chart._adapters._date.override<{myAdapterOption: string}>({
    *   init() {
    *     console.log(this.options.myAdapterOption);
    *   }
    * })
    */
    static override(members) {
      Object.assign(DateAdapterBase.prototype, members);
    }
    constructor(options) {
      this.options = options || {};
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    init() {
    }
    formats() {
      return abstract();
    }
    parse() {
      return abstract();
    }
    format() {
      return abstract();
    }
    add() {
      return abstract();
    }
    diff() {
      return abstract();
    }
    startOf() {
      return abstract();
    }
    endOf() {
      return abstract();
    }
  };
  var adapters = {
    _date: DateAdapterBase
  };
  function binarySearch(metaset, axis, value, intersect) {
    const { controller, data, _sorted } = metaset;
    const iScale = controller._cachedMeta.iScale;
    if (iScale && axis === iScale.axis && axis !== "r" && _sorted && data.length) {
      const lookupMethod = iScale._reversePixels ? _rlookupByKey : _lookupByKey;
      if (!intersect) {
        return lookupMethod(data, axis, value);
      } else if (controller._sharedOptions) {
        const el = data[0];
        const range = typeof el.getRange === "function" && el.getRange(axis);
        if (range) {
          const start2 = lookupMethod(data, axis, value - range);
          const end = lookupMethod(data, axis, value + range);
          return {
            lo: start2.lo,
            hi: end.hi
          };
        }
      }
    }
    return {
      lo: 0,
      hi: data.length - 1
    };
  }
  function evaluateInteractionItems(chart, axis, position, handler, intersect) {
    const metasets = chart.getSortedVisibleDatasetMetas();
    const value = position[axis];
    for (let i = 0, ilen = metasets.length; i < ilen; ++i) {
      const { index: index2, data } = metasets[i];
      const { lo, hi } = binarySearch(metasets[i], axis, value, intersect);
      for (let j = lo; j <= hi; ++j) {
        const element = data[j];
        if (!element.skip) {
          handler(element, index2, j);
        }
      }
    }
  }
  function getDistanceMetricForAxis(axis) {
    const useX = axis.indexOf("x") !== -1;
    const useY = axis.indexOf("y") !== -1;
    return function(pt1, pt2) {
      const deltaX = useX ? Math.abs(pt1.x - pt2.x) : 0;
      const deltaY = useY ? Math.abs(pt1.y - pt2.y) : 0;
      return Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
    };
  }
  function getIntersectItems(chart, position, axis, useFinalPosition, includeInvisible) {
    const items = [];
    if (!includeInvisible && !chart.isPointInArea(position)) {
      return items;
    }
    const evaluationFunc = function(element, datasetIndex, index2) {
      if (!includeInvisible && !_isPointInArea(element, chart.chartArea, 0)) {
        return;
      }
      if (element.inRange(position.x, position.y, useFinalPosition)) {
        items.push({
          element,
          datasetIndex,
          index: index2
        });
      }
    };
    evaluateInteractionItems(chart, axis, position, evaluationFunc, true);
    return items;
  }
  function getNearestRadialItems(chart, position, axis, useFinalPosition) {
    let items = [];
    function evaluationFunc(element, datasetIndex, index2) {
      const { startAngle, endAngle } = element.getProps([
        "startAngle",
        "endAngle"
      ], useFinalPosition);
      const { angle } = getAngleFromPoint(element, {
        x: position.x,
        y: position.y
      });
      if (_angleBetween(angle, startAngle, endAngle)) {
        items.push({
          element,
          datasetIndex,
          index: index2
        });
      }
    }
    evaluateInteractionItems(chart, axis, position, evaluationFunc);
    return items;
  }
  function getNearestCartesianItems(chart, position, axis, intersect, useFinalPosition, includeInvisible) {
    let items = [];
    const distanceMetric = getDistanceMetricForAxis(axis);
    let minDistance = Number.POSITIVE_INFINITY;
    function evaluationFunc(element, datasetIndex, index2) {
      const inRange2 = element.inRange(position.x, position.y, useFinalPosition);
      if (intersect && !inRange2) {
        return;
      }
      const center = element.getCenterPoint(useFinalPosition);
      const pointInArea = !!includeInvisible || chart.isPointInArea(center);
      if (!pointInArea && !inRange2) {
        return;
      }
      const distance = distanceMetric(position, center);
      if (distance < minDistance) {
        items = [
          {
            element,
            datasetIndex,
            index: index2
          }
        ];
        minDistance = distance;
      } else if (distance === minDistance) {
        items.push({
          element,
          datasetIndex,
          index: index2
        });
      }
    }
    evaluateInteractionItems(chart, axis, position, evaluationFunc);
    return items;
  }
  function getNearestItems(chart, position, axis, intersect, useFinalPosition, includeInvisible) {
    if (!includeInvisible && !chart.isPointInArea(position)) {
      return [];
    }
    return axis === "r" && !intersect ? getNearestRadialItems(chart, position, axis, useFinalPosition) : getNearestCartesianItems(chart, position, axis, intersect, useFinalPosition, includeInvisible);
  }
  function getAxisItems(chart, position, axis, intersect, useFinalPosition) {
    const items = [];
    const rangeMethod = axis === "x" ? "inXRange" : "inYRange";
    let intersectsItem = false;
    evaluateInteractionItems(chart, axis, position, (element, datasetIndex, index2) => {
      if (element[rangeMethod](position[axis], useFinalPosition)) {
        items.push({
          element,
          datasetIndex,
          index: index2
        });
        intersectsItem = intersectsItem || element.inRange(position.x, position.y, useFinalPosition);
      }
    });
    if (intersect && !intersectsItem) {
      return [];
    }
    return items;
  }
  var Interaction = {
    evaluateInteractionItems,
    modes: {
      index(chart, e, options, useFinalPosition) {
        const position = getRelativePosition(e, chart);
        const axis = options.axis || "x";
        const includeInvisible = options.includeInvisible || false;
        const items = options.intersect ? getIntersectItems(chart, position, axis, useFinalPosition, includeInvisible) : getNearestItems(chart, position, axis, false, useFinalPosition, includeInvisible);
        const elements2 = [];
        if (!items.length) {
          return [];
        }
        chart.getSortedVisibleDatasetMetas().forEach((meta) => {
          const index2 = items[0].index;
          const element = meta.data[index2];
          if (element && !element.skip) {
            elements2.push({
              element,
              datasetIndex: meta.index,
              index: index2
            });
          }
        });
        return elements2;
      },
      dataset(chart, e, options, useFinalPosition) {
        const position = getRelativePosition(e, chart);
        const axis = options.axis || "xy";
        const includeInvisible = options.includeInvisible || false;
        let items = options.intersect ? getIntersectItems(chart, position, axis, useFinalPosition, includeInvisible) : getNearestItems(chart, position, axis, false, useFinalPosition, includeInvisible);
        if (items.length > 0) {
          const datasetIndex = items[0].datasetIndex;
          const data = chart.getDatasetMeta(datasetIndex).data;
          items = [];
          for (let i = 0; i < data.length; ++i) {
            items.push({
              element: data[i],
              datasetIndex,
              index: i
            });
          }
        }
        return items;
      },
      point(chart, e, options, useFinalPosition) {
        const position = getRelativePosition(e, chart);
        const axis = options.axis || "xy";
        const includeInvisible = options.includeInvisible || false;
        return getIntersectItems(chart, position, axis, useFinalPosition, includeInvisible);
      },
      nearest(chart, e, options, useFinalPosition) {
        const position = getRelativePosition(e, chart);
        const axis = options.axis || "xy";
        const includeInvisible = options.includeInvisible || false;
        return getNearestItems(chart, position, axis, options.intersect, useFinalPosition, includeInvisible);
      },
      x(chart, e, options, useFinalPosition) {
        const position = getRelativePosition(e, chart);
        return getAxisItems(chart, position, "x", options.intersect, useFinalPosition);
      },
      y(chart, e, options, useFinalPosition) {
        const position = getRelativePosition(e, chart);
        return getAxisItems(chart, position, "y", options.intersect, useFinalPosition);
      }
    }
  };
  var STATIC_POSITIONS = [
    "left",
    "top",
    "right",
    "bottom"
  ];
  function filterByPosition(array2, position) {
    return array2.filter((v) => v.pos === position);
  }
  function filterDynamicPositionByAxis(array2, axis) {
    return array2.filter((v) => STATIC_POSITIONS.indexOf(v.pos) === -1 && v.box.axis === axis);
  }
  function sortByWeight(array2, reverse) {
    return array2.sort((a, b) => {
      const v0 = reverse ? b : a;
      const v1 = reverse ? a : b;
      return v0.weight === v1.weight ? v0.index - v1.index : v0.weight - v1.weight;
    });
  }
  function wrapBoxes(boxes) {
    const layoutBoxes = [];
    let i, ilen, box, pos, stack, stackWeight;
    for (i = 0, ilen = (boxes || []).length; i < ilen; ++i) {
      box = boxes[i];
      ({ position: pos, options: { stack, stackWeight = 1 } } = box);
      layoutBoxes.push({
        index: i,
        box,
        pos,
        horizontal: box.isHorizontal(),
        weight: box.weight,
        stack: stack && pos + stack,
        stackWeight
      });
    }
    return layoutBoxes;
  }
  function buildStacks(layouts2) {
    const stacks = {};
    for (const wrap of layouts2) {
      const { stack, pos, stackWeight } = wrap;
      if (!stack || !STATIC_POSITIONS.includes(pos)) {
        continue;
      }
      const _stack = stacks[stack] || (stacks[stack] = {
        count: 0,
        placed: 0,
        weight: 0,
        size: 0
      });
      _stack.count++;
      _stack.weight += stackWeight;
    }
    return stacks;
  }
  function setLayoutDims(layouts2, params) {
    const stacks = buildStacks(layouts2);
    const { vBoxMaxWidth, hBoxMaxHeight } = params;
    let i, ilen, layout;
    for (i = 0, ilen = layouts2.length; i < ilen; ++i) {
      layout = layouts2[i];
      const { fullSize } = layout.box;
      const stack = stacks[layout.stack];
      const factor = stack && layout.stackWeight / stack.weight;
      if (layout.horizontal) {
        layout.width = factor ? factor * vBoxMaxWidth : fullSize && params.availableWidth;
        layout.height = hBoxMaxHeight;
      } else {
        layout.width = vBoxMaxWidth;
        layout.height = factor ? factor * hBoxMaxHeight : fullSize && params.availableHeight;
      }
    }
    return stacks;
  }
  function buildLayoutBoxes(boxes) {
    const layoutBoxes = wrapBoxes(boxes);
    const fullSize = sortByWeight(layoutBoxes.filter((wrap) => wrap.box.fullSize), true);
    const left = sortByWeight(filterByPosition(layoutBoxes, "left"), true);
    const right = sortByWeight(filterByPosition(layoutBoxes, "right"));
    const top = sortByWeight(filterByPosition(layoutBoxes, "top"), true);
    const bottom = sortByWeight(filterByPosition(layoutBoxes, "bottom"));
    const centerHorizontal = filterDynamicPositionByAxis(layoutBoxes, "x");
    const centerVertical = filterDynamicPositionByAxis(layoutBoxes, "y");
    return {
      fullSize,
      leftAndTop: left.concat(top),
      rightAndBottom: right.concat(centerVertical).concat(bottom).concat(centerHorizontal),
      chartArea: filterByPosition(layoutBoxes, "chartArea"),
      vertical: left.concat(right).concat(centerVertical),
      horizontal: top.concat(bottom).concat(centerHorizontal)
    };
  }
  function getCombinedMax(maxPadding, chartArea, a, b) {
    return Math.max(maxPadding[a], chartArea[a]) + Math.max(maxPadding[b], chartArea[b]);
  }
  function updateMaxPadding(maxPadding, boxPadding) {
    maxPadding.top = Math.max(maxPadding.top, boxPadding.top);
    maxPadding.left = Math.max(maxPadding.left, boxPadding.left);
    maxPadding.bottom = Math.max(maxPadding.bottom, boxPadding.bottom);
    maxPadding.right = Math.max(maxPadding.right, boxPadding.right);
  }
  function updateDims(chartArea, params, layout, stacks) {
    const { pos, box } = layout;
    const maxPadding = chartArea.maxPadding;
    if (!isObject(pos)) {
      if (layout.size) {
        chartArea[pos] -= layout.size;
      }
      const stack = stacks[layout.stack] || {
        size: 0,
        count: 1
      };
      stack.size = Math.max(stack.size, layout.horizontal ? box.height : box.width);
      layout.size = stack.size / stack.count;
      chartArea[pos] += layout.size;
    }
    if (box.getPadding) {
      updateMaxPadding(maxPadding, box.getPadding());
    }
    const newWidth = Math.max(0, params.outerWidth - getCombinedMax(maxPadding, chartArea, "left", "right"));
    const newHeight = Math.max(0, params.outerHeight - getCombinedMax(maxPadding, chartArea, "top", "bottom"));
    const widthChanged = newWidth !== chartArea.w;
    const heightChanged = newHeight !== chartArea.h;
    chartArea.w = newWidth;
    chartArea.h = newHeight;
    return layout.horizontal ? {
      same: widthChanged,
      other: heightChanged
    } : {
      same: heightChanged,
      other: widthChanged
    };
  }
  function handleMaxPadding(chartArea) {
    const maxPadding = chartArea.maxPadding;
    function updatePos(pos) {
      const change = Math.max(maxPadding[pos] - chartArea[pos], 0);
      chartArea[pos] += change;
      return change;
    }
    chartArea.y += updatePos("top");
    chartArea.x += updatePos("left");
    updatePos("right");
    updatePos("bottom");
  }
  function getMargins(horizontal, chartArea) {
    const maxPadding = chartArea.maxPadding;
    function marginForPositions(positions2) {
      const margin = {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
      };
      positions2.forEach((pos) => {
        margin[pos] = Math.max(chartArea[pos], maxPadding[pos]);
      });
      return margin;
    }
    return horizontal ? marginForPositions([
      "left",
      "right"
    ]) : marginForPositions([
      "top",
      "bottom"
    ]);
  }
  function fitBoxes(boxes, chartArea, params, stacks) {
    const refitBoxes = [];
    let i, ilen, layout, box, refit, changed;
    for (i = 0, ilen = boxes.length, refit = 0; i < ilen; ++i) {
      layout = boxes[i];
      box = layout.box;
      box.update(layout.width || chartArea.w, layout.height || chartArea.h, getMargins(layout.horizontal, chartArea));
      const { same, other } = updateDims(chartArea, params, layout, stacks);
      refit |= same && refitBoxes.length;
      changed = changed || other;
      if (!box.fullSize) {
        refitBoxes.push(layout);
      }
    }
    return refit && fitBoxes(refitBoxes, chartArea, params, stacks) || changed;
  }
  function setBoxDims(box, left, top, width, height) {
    box.top = top;
    box.left = left;
    box.right = left + width;
    box.bottom = top + height;
    box.width = width;
    box.height = height;
  }
  function placeBoxes(boxes, chartArea, params, stacks) {
    const userPadding = params.padding;
    let { x, y } = chartArea;
    for (const layout of boxes) {
      const box = layout.box;
      const stack = stacks[layout.stack] || {
        count: 1,
        placed: 0,
        weight: 1
      };
      const weight = layout.stackWeight / stack.weight || 1;
      if (layout.horizontal) {
        const width = chartArea.w * weight;
        const height = stack.size || box.height;
        if (defined(stack.start)) {
          y = stack.start;
        }
        if (box.fullSize) {
          setBoxDims(box, userPadding.left, y, params.outerWidth - userPadding.right - userPadding.left, height);
        } else {
          setBoxDims(box, chartArea.left + stack.placed, y, width, height);
        }
        stack.start = y;
        stack.placed += width;
        y = box.bottom;
      } else {
        const height1 = chartArea.h * weight;
        const width1 = stack.size || box.width;
        if (defined(stack.start)) {
          x = stack.start;
        }
        if (box.fullSize) {
          setBoxDims(box, x, userPadding.top, width1, params.outerHeight - userPadding.bottom - userPadding.top);
        } else {
          setBoxDims(box, x, chartArea.top + stack.placed, width1, height1);
        }
        stack.start = x;
        stack.placed += height1;
        x = box.right;
      }
    }
    chartArea.x = x;
    chartArea.y = y;
  }
  var layouts = {
    addBox(chart, item) {
      if (!chart.boxes) {
        chart.boxes = [];
      }
      item.fullSize = item.fullSize || false;
      item.position = item.position || "top";
      item.weight = item.weight || 0;
      item._layers = item._layers || function() {
        return [
          {
            z: 0,
            draw(chartArea) {
              item.draw(chartArea);
            }
          }
        ];
      };
      chart.boxes.push(item);
    },
    removeBox(chart, layoutItem) {
      const index2 = chart.boxes ? chart.boxes.indexOf(layoutItem) : -1;
      if (index2 !== -1) {
        chart.boxes.splice(index2, 1);
      }
    },
    configure(chart, item, options) {
      item.fullSize = options.fullSize;
      item.position = options.position;
      item.weight = options.weight;
    },
    update(chart, width, height, minPadding) {
      if (!chart) {
        return;
      }
      const padding = toPadding(chart.options.layout.padding);
      const availableWidth = Math.max(width - padding.width, 0);
      const availableHeight = Math.max(height - padding.height, 0);
      const boxes = buildLayoutBoxes(chart.boxes);
      const verticalBoxes = boxes.vertical;
      const horizontalBoxes = boxes.horizontal;
      each(chart.boxes, (box) => {
        if (typeof box.beforeLayout === "function") {
          box.beforeLayout();
        }
      });
      const visibleVerticalBoxCount = verticalBoxes.reduce((total, wrap) => wrap.box.options && wrap.box.options.display === false ? total : total + 1, 0) || 1;
      const params = Object.freeze({
        outerWidth: width,
        outerHeight: height,
        padding,
        availableWidth,
        availableHeight,
        vBoxMaxWidth: availableWidth / 2 / visibleVerticalBoxCount,
        hBoxMaxHeight: availableHeight / 2
      });
      const maxPadding = Object.assign({}, padding);
      updateMaxPadding(maxPadding, toPadding(minPadding));
      const chartArea = Object.assign({
        maxPadding,
        w: availableWidth,
        h: availableHeight,
        x: padding.left,
        y: padding.top
      }, padding);
      const stacks = setLayoutDims(verticalBoxes.concat(horizontalBoxes), params);
      fitBoxes(boxes.fullSize, chartArea, params, stacks);
      fitBoxes(verticalBoxes, chartArea, params, stacks);
      if (fitBoxes(horizontalBoxes, chartArea, params, stacks)) {
        fitBoxes(verticalBoxes, chartArea, params, stacks);
      }
      handleMaxPadding(chartArea);
      placeBoxes(boxes.leftAndTop, chartArea, params, stacks);
      chartArea.x += chartArea.w;
      chartArea.y += chartArea.h;
      placeBoxes(boxes.rightAndBottom, chartArea, params, stacks);
      chart.chartArea = {
        left: chartArea.left,
        top: chartArea.top,
        right: chartArea.left + chartArea.w,
        bottom: chartArea.top + chartArea.h,
        height: chartArea.h,
        width: chartArea.w
      };
      each(boxes.chartArea, (layout) => {
        const box = layout.box;
        Object.assign(box, chart.chartArea);
        box.update(chartArea.w, chartArea.h, {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0
        });
      });
    }
  };
  var BasePlatform = class {
    acquireContext(canvas, aspectRatio) {
    }
    releaseContext(context) {
      return false;
    }
    addEventListener(chart, type2, listener) {
    }
    removeEventListener(chart, type2, listener) {
    }
    getDevicePixelRatio() {
      return 1;
    }
    getMaximumSize(element, width, height, aspectRatio) {
      width = Math.max(0, width || element.width);
      height = height || element.height;
      return {
        width,
        height: Math.max(0, aspectRatio ? Math.floor(width / aspectRatio) : height)
      };
    }
    isAttached(canvas) {
      return true;
    }
    updateConfig(config) {
    }
  };
  var BasicPlatform = class extends BasePlatform {
    acquireContext(item) {
      return item && item.getContext && item.getContext("2d") || null;
    }
    updateConfig(config) {
      config.options.animation = false;
    }
  };
  var EXPANDO_KEY = "$chartjs";
  var EVENT_TYPES = {
    touchstart: "mousedown",
    touchmove: "mousemove",
    touchend: "mouseup",
    pointerenter: "mouseenter",
    pointerdown: "mousedown",
    pointermove: "mousemove",
    pointerup: "mouseup",
    pointerleave: "mouseout",
    pointerout: "mouseout"
  };
  var isNullOrEmpty = (value) => value === null || value === "";
  function initCanvas(canvas, aspectRatio) {
    const style = canvas.style;
    const renderHeight = canvas.getAttribute("height");
    const renderWidth = canvas.getAttribute("width");
    canvas[EXPANDO_KEY] = {
      initial: {
        height: renderHeight,
        width: renderWidth,
        style: {
          display: style.display,
          height: style.height,
          width: style.width
        }
      }
    };
    style.display = style.display || "block";
    style.boxSizing = style.boxSizing || "border-box";
    if (isNullOrEmpty(renderWidth)) {
      const displayWidth = readUsedSize(canvas, "width");
      if (displayWidth !== void 0) {
        canvas.width = displayWidth;
      }
    }
    if (isNullOrEmpty(renderHeight)) {
      if (canvas.style.height === "") {
        canvas.height = canvas.width / (aspectRatio || 2);
      } else {
        const displayHeight = readUsedSize(canvas, "height");
        if (displayHeight !== void 0) {
          canvas.height = displayHeight;
        }
      }
    }
    return canvas;
  }
  var eventListenerOptions = supportsEventListenerOptions ? {
    passive: true
  } : false;
  function addListener(node, type2, listener) {
    node.addEventListener(type2, listener, eventListenerOptions);
  }
  function removeListener(chart, type2, listener) {
    chart.canvas.removeEventListener(type2, listener, eventListenerOptions);
  }
  function fromNativeEvent(event, chart) {
    const type2 = EVENT_TYPES[event.type] || event.type;
    const { x, y } = getRelativePosition(event, chart);
    return {
      type: type2,
      chart,
      native: event,
      x: x !== void 0 ? x : null,
      y: y !== void 0 ? y : null
    };
  }
  function nodeListContains(nodeList, canvas) {
    for (const node of nodeList) {
      if (node === canvas || node.contains(canvas)) {
        return true;
      }
    }
  }
  function createAttachObserver(chart, type2, listener) {
    const canvas = chart.canvas;
    const observer = new MutationObserver((entries) => {
      let trigger = false;
      for (const entry of entries) {
        trigger = trigger || nodeListContains(entry.addedNodes, canvas);
        trigger = trigger && !nodeListContains(entry.removedNodes, canvas);
      }
      if (trigger) {
        listener();
      }
    });
    observer.observe(document, {
      childList: true,
      subtree: true
    });
    return observer;
  }
  function createDetachObserver(chart, type2, listener) {
    const canvas = chart.canvas;
    const observer = new MutationObserver((entries) => {
      let trigger = false;
      for (const entry of entries) {
        trigger = trigger || nodeListContains(entry.removedNodes, canvas);
        trigger = trigger && !nodeListContains(entry.addedNodes, canvas);
      }
      if (trigger) {
        listener();
      }
    });
    observer.observe(document, {
      childList: true,
      subtree: true
    });
    return observer;
  }
  var drpListeningCharts = /* @__PURE__ */ new Map();
  var oldDevicePixelRatio = 0;
  function onWindowResize() {
    const dpr = window.devicePixelRatio;
    if (dpr === oldDevicePixelRatio) {
      return;
    }
    oldDevicePixelRatio = dpr;
    drpListeningCharts.forEach((resize, chart) => {
      if (chart.currentDevicePixelRatio !== dpr) {
        resize();
      }
    });
  }
  function listenDevicePixelRatioChanges(chart, resize) {
    if (!drpListeningCharts.size) {
      window.addEventListener("resize", onWindowResize);
    }
    drpListeningCharts.set(chart, resize);
  }
  function unlistenDevicePixelRatioChanges(chart) {
    drpListeningCharts.delete(chart);
    if (!drpListeningCharts.size) {
      window.removeEventListener("resize", onWindowResize);
    }
  }
  function createResizeObserver(chart, type2, listener) {
    const canvas = chart.canvas;
    const container = canvas && _getParentNode(canvas);
    if (!container) {
      return;
    }
    const resize = throttled((width, height) => {
      const w = container.clientWidth;
      listener(width, height);
      if (w < container.clientWidth) {
        listener();
      }
    }, window);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;
      if (width === 0 && height === 0) {
        return;
      }
      resize(width, height);
    });
    observer.observe(container);
    listenDevicePixelRatioChanges(chart, resize);
    return observer;
  }
  function releaseObserver(chart, type2, observer) {
    if (observer) {
      observer.disconnect();
    }
    if (type2 === "resize") {
      unlistenDevicePixelRatioChanges(chart);
    }
  }
  function createProxyAndListen(chart, type2, listener) {
    const canvas = chart.canvas;
    const proxy = throttled((event) => {
      if (chart.ctx !== null) {
        listener(fromNativeEvent(event, chart));
      }
    }, chart);
    addListener(canvas, type2, proxy);
    return proxy;
  }
  var DomPlatform = class extends BasePlatform {
    acquireContext(canvas, aspectRatio) {
      const context = canvas && canvas.getContext && canvas.getContext("2d");
      if (context && context.canvas === canvas) {
        initCanvas(canvas, aspectRatio);
        return context;
      }
      return null;
    }
    releaseContext(context) {
      const canvas = context.canvas;
      if (!canvas[EXPANDO_KEY]) {
        return false;
      }
      const initial = canvas[EXPANDO_KEY].initial;
      [
        "height",
        "width"
      ].forEach((prop) => {
        const value = initial[prop];
        if (isNullOrUndef(value)) {
          canvas.removeAttribute(prop);
        } else {
          canvas.setAttribute(prop, value);
        }
      });
      const style = initial.style || {};
      Object.keys(style).forEach((key) => {
        canvas.style[key] = style[key];
      });
      canvas.width = canvas.width;
      delete canvas[EXPANDO_KEY];
      return true;
    }
    addEventListener(chart, type2, listener) {
      this.removeEventListener(chart, type2);
      const proxies = chart.$proxies || (chart.$proxies = {});
      const handlers = {
        attach: createAttachObserver,
        detach: createDetachObserver,
        resize: createResizeObserver
      };
      const handler = handlers[type2] || createProxyAndListen;
      proxies[type2] = handler(chart, type2, listener);
    }
    removeEventListener(chart, type2) {
      const proxies = chart.$proxies || (chart.$proxies = {});
      const proxy = proxies[type2];
      if (!proxy) {
        return;
      }
      const handlers = {
        attach: releaseObserver,
        detach: releaseObserver,
        resize: releaseObserver
      };
      const handler = handlers[type2] || removeListener;
      handler(chart, type2, proxy);
      proxies[type2] = void 0;
    }
    getDevicePixelRatio() {
      return window.devicePixelRatio;
    }
    getMaximumSize(canvas, width, height, aspectRatio) {
      return getMaximumSize(canvas, width, height, aspectRatio);
    }
    isAttached(canvas) {
      const container = _getParentNode(canvas);
      return !!(container && container.isConnected);
    }
  };
  function _detectPlatform(canvas) {
    if (!_isDomSupported() || typeof OffscreenCanvas !== "undefined" && canvas instanceof OffscreenCanvas) {
      return BasicPlatform;
    }
    return DomPlatform;
  }
  var Element = class {
    active = false;
    tooltipPosition(useFinalPosition) {
      const { x, y } = this.getProps([
        "x",
        "y"
      ], useFinalPosition);
      return {
        x,
        y
      };
    }
    hasValue() {
      return isNumber(this.x) && isNumber(this.y);
    }
    getProps(props, final) {
      const anims = this.$animations;
      if (!final || !anims) {
        return this;
      }
      const ret = {};
      props.forEach((prop) => {
        ret[prop] = anims[prop] && anims[prop].active() ? anims[prop]._to : this[prop];
      });
      return ret;
    }
  };
  __publicField(Element, "defaults", {});
  __publicField(Element, "defaultRoutes");
  function autoSkip(scale, ticks2) {
    const tickOpts = scale.options.ticks;
    const determinedMaxTicks = determineMaxTicks(scale);
    const ticksLimit = Math.min(tickOpts.maxTicksLimit || determinedMaxTicks, determinedMaxTicks);
    const majorIndices = tickOpts.major.enabled ? getMajorIndices(ticks2) : [];
    const numMajorIndices = majorIndices.length;
    const first = majorIndices[0];
    const last = majorIndices[numMajorIndices - 1];
    const newTicks = [];
    if (numMajorIndices > ticksLimit) {
      skipMajors(ticks2, newTicks, majorIndices, numMajorIndices / ticksLimit);
      return newTicks;
    }
    const spacing = calculateSpacing(majorIndices, ticks2, ticksLimit);
    if (numMajorIndices > 0) {
      let i, ilen;
      const avgMajorSpacing = numMajorIndices > 1 ? Math.round((last - first) / (numMajorIndices - 1)) : null;
      skip(ticks2, newTicks, spacing, isNullOrUndef(avgMajorSpacing) ? 0 : first - avgMajorSpacing, first);
      for (i = 0, ilen = numMajorIndices - 1; i < ilen; i++) {
        skip(ticks2, newTicks, spacing, majorIndices[i], majorIndices[i + 1]);
      }
      skip(ticks2, newTicks, spacing, last, isNullOrUndef(avgMajorSpacing) ? ticks2.length : last + avgMajorSpacing);
      return newTicks;
    }
    skip(ticks2, newTicks, spacing);
    return newTicks;
  }
  function determineMaxTicks(scale) {
    const offset = scale.options.offset;
    const tickLength = scale._tickSize();
    const maxScale = scale._length / tickLength + (offset ? 0 : 1);
    const maxChart = scale._maxLength / tickLength;
    return Math.floor(Math.min(maxScale, maxChart));
  }
  function calculateSpacing(majorIndices, ticks2, ticksLimit) {
    const evenMajorSpacing = getEvenSpacing(majorIndices);
    const spacing = ticks2.length / ticksLimit;
    if (!evenMajorSpacing) {
      return Math.max(spacing, 1);
    }
    const factors = _factorize(evenMajorSpacing);
    for (let i = 0, ilen = factors.length - 1; i < ilen; i++) {
      const factor = factors[i];
      if (factor > spacing) {
        return factor;
      }
    }
    return Math.max(spacing, 1);
  }
  function getMajorIndices(ticks2) {
    const result = [];
    let i, ilen;
    for (i = 0, ilen = ticks2.length; i < ilen; i++) {
      if (ticks2[i].major) {
        result.push(i);
      }
    }
    return result;
  }
  function skipMajors(ticks2, newTicks, majorIndices, spacing) {
    let count = 0;
    let next = majorIndices[0];
    let i;
    spacing = Math.ceil(spacing);
    for (i = 0; i < ticks2.length; i++) {
      if (i === next) {
        newTicks.push(ticks2[i]);
        count++;
        next = majorIndices[count * spacing];
      }
    }
  }
  function skip(ticks2, newTicks, spacing, majorStart, majorEnd) {
    const start2 = valueOrDefault(majorStart, 0);
    const end = Math.min(valueOrDefault(majorEnd, ticks2.length), ticks2.length);
    let count = 0;
    let length, i, next;
    spacing = Math.ceil(spacing);
    if (majorEnd) {
      length = majorEnd - majorStart;
      spacing = length / Math.floor(length / spacing);
    }
    next = start2;
    while (next < 0) {
      count++;
      next = Math.round(start2 + count * spacing);
    }
    for (i = Math.max(start2, 0); i < end; i++) {
      if (i === next) {
        newTicks.push(ticks2[i]);
        count++;
        next = Math.round(start2 + count * spacing);
      }
    }
  }
  function getEvenSpacing(arr) {
    const len = arr.length;
    let i, diff;
    if (len < 2) {
      return false;
    }
    for (diff = arr[0], i = 1; i < len; ++i) {
      if (arr[i] - arr[i - 1] !== diff) {
        return false;
      }
    }
    return diff;
  }
  var reverseAlign = (align) => align === "left" ? "right" : align === "right" ? "left" : align;
  var offsetFromEdge = (scale, edge, offset) => edge === "top" || edge === "left" ? scale[edge] + offset : scale[edge] - offset;
  var getTicksLimit = (ticksLength, maxTicksLimit) => Math.min(maxTicksLimit || ticksLength, ticksLength);
  function sample(arr, numItems) {
    const result = [];
    const increment = arr.length / numItems;
    const len = arr.length;
    let i = 0;
    for (; i < len; i += increment) {
      result.push(arr[Math.floor(i)]);
    }
    return result;
  }
  function getPixelForGridLine(scale, index2, offsetGridLines) {
    const length = scale.ticks.length;
    const validIndex2 = Math.min(index2, length - 1);
    const start2 = scale._startPixel;
    const end = scale._endPixel;
    const epsilon = 1e-6;
    let lineValue = scale.getPixelForTick(validIndex2);
    let offset;
    if (offsetGridLines) {
      if (length === 1) {
        offset = Math.max(lineValue - start2, end - lineValue);
      } else if (index2 === 0) {
        offset = (scale.getPixelForTick(1) - lineValue) / 2;
      } else {
        offset = (lineValue - scale.getPixelForTick(validIndex2 - 1)) / 2;
      }
      lineValue += validIndex2 < index2 ? offset : -offset;
      if (lineValue < start2 - epsilon || lineValue > end + epsilon) {
        return;
      }
    }
    return lineValue;
  }
  function garbageCollect(caches, length) {
    each(caches, (cache) => {
      const gc = cache.gc;
      const gcLen = gc.length / 2;
      let i;
      if (gcLen > length) {
        for (i = 0; i < gcLen; ++i) {
          delete cache.data[gc[i]];
        }
        gc.splice(0, gcLen);
      }
    });
  }
  function getTickMarkLength(options) {
    return options.drawTicks ? options.tickLength : 0;
  }
  function getTitleHeight(options, fallback) {
    if (!options.display) {
      return 0;
    }
    const font = toFont(options.font, fallback);
    const padding = toPadding(options.padding);
    const lines = isArray(options.text) ? options.text.length : 1;
    return lines * font.lineHeight + padding.height;
  }
  function createScaleContext(parent, scale) {
    return createContext(parent, {
      scale,
      type: "scale"
    });
  }
  function createTickContext(parent, index2, tick) {
    return createContext(parent, {
      tick,
      index: index2,
      type: "tick"
    });
  }
  function titleAlign(align, position, reverse) {
    let ret = _toLeftRightCenter(align);
    if (reverse && position !== "right" || !reverse && position === "right") {
      ret = reverseAlign(ret);
    }
    return ret;
  }
  function titleArgs(scale, offset, position, align) {
    const { top, left, bottom, right, chart } = scale;
    const { chartArea, scales: scales2 } = chart;
    let rotation = 0;
    let maxWidth, titleX, titleY;
    const height = bottom - top;
    const width = right - left;
    if (scale.isHorizontal()) {
      titleX = _alignStartEnd(align, left, right);
      if (isObject(position)) {
        const positionAxisID = Object.keys(position)[0];
        const value = position[positionAxisID];
        titleY = scales2[positionAxisID].getPixelForValue(value) + height - offset;
      } else if (position === "center") {
        titleY = (chartArea.bottom + chartArea.top) / 2 + height - offset;
      } else {
        titleY = offsetFromEdge(scale, position, offset);
      }
      maxWidth = right - left;
    } else {
      if (isObject(position)) {
        const positionAxisID1 = Object.keys(position)[0];
        const value1 = position[positionAxisID1];
        titleX = scales2[positionAxisID1].getPixelForValue(value1) - width + offset;
      } else if (position === "center") {
        titleX = (chartArea.left + chartArea.right) / 2 - width + offset;
      } else {
        titleX = offsetFromEdge(scale, position, offset);
      }
      titleY = _alignStartEnd(align, bottom, top);
      rotation = position === "left" ? -HALF_PI : HALF_PI;
    }
    return {
      titleX,
      titleY,
      maxWidth,
      rotation
    };
  }
  var Scale = class extends Element {
    constructor(cfg) {
      super();
      this.id = cfg.id;
      this.type = cfg.type;
      this.options = void 0;
      this.ctx = cfg.ctx;
      this.chart = cfg.chart;
      this.top = void 0;
      this.bottom = void 0;
      this.left = void 0;
      this.right = void 0;
      this.width = void 0;
      this.height = void 0;
      this._margins = {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      };
      this.maxWidth = void 0;
      this.maxHeight = void 0;
      this.paddingTop = void 0;
      this.paddingBottom = void 0;
      this.paddingLeft = void 0;
      this.paddingRight = void 0;
      this.axis = void 0;
      this.labelRotation = void 0;
      this.min = void 0;
      this.max = void 0;
      this._range = void 0;
      this.ticks = [];
      this._gridLineItems = null;
      this._labelItems = null;
      this._labelSizes = null;
      this._length = 0;
      this._maxLength = 0;
      this._longestTextCache = {};
      this._startPixel = void 0;
      this._endPixel = void 0;
      this._reversePixels = false;
      this._userMax = void 0;
      this._userMin = void 0;
      this._suggestedMax = void 0;
      this._suggestedMin = void 0;
      this._ticksLength = 0;
      this._borderValue = 0;
      this._cache = {};
      this._dataLimitsCached = false;
      this.$context = void 0;
    }
    init(options) {
      this.options = options.setContext(this.getContext());
      this.axis = options.axis;
      this._userMin = this.parse(options.min);
      this._userMax = this.parse(options.max);
      this._suggestedMin = this.parse(options.suggestedMin);
      this._suggestedMax = this.parse(options.suggestedMax);
    }
    parse(raw, index2) {
      return raw;
    }
    getUserBounds() {
      let { _userMin, _userMax, _suggestedMin, _suggestedMax } = this;
      _userMin = finiteOrDefault(_userMin, Number.POSITIVE_INFINITY);
      _userMax = finiteOrDefault(_userMax, Number.NEGATIVE_INFINITY);
      _suggestedMin = finiteOrDefault(_suggestedMin, Number.POSITIVE_INFINITY);
      _suggestedMax = finiteOrDefault(_suggestedMax, Number.NEGATIVE_INFINITY);
      return {
        min: finiteOrDefault(_userMin, _suggestedMin),
        max: finiteOrDefault(_userMax, _suggestedMax),
        minDefined: isNumberFinite(_userMin),
        maxDefined: isNumberFinite(_userMax)
      };
    }
    getMinMax(canStack) {
      let { min: min2, max: max2, minDefined, maxDefined } = this.getUserBounds();
      let range;
      if (minDefined && maxDefined) {
        return {
          min: min2,
          max: max2
        };
      }
      const metas = this.getMatchingVisibleMetas();
      for (let i = 0, ilen = metas.length; i < ilen; ++i) {
        range = metas[i].controller.getMinMax(this, canStack);
        if (!minDefined) {
          min2 = Math.min(min2, range.min);
        }
        if (!maxDefined) {
          max2 = Math.max(max2, range.max);
        }
      }
      min2 = maxDefined && min2 > max2 ? max2 : min2;
      max2 = minDefined && min2 > max2 ? min2 : max2;
      return {
        min: finiteOrDefault(min2, finiteOrDefault(max2, min2)),
        max: finiteOrDefault(max2, finiteOrDefault(min2, max2))
      };
    }
    getPadding() {
      return {
        left: this.paddingLeft || 0,
        top: this.paddingTop || 0,
        right: this.paddingRight || 0,
        bottom: this.paddingBottom || 0
      };
    }
    getTicks() {
      return this.ticks;
    }
    getLabels() {
      const data = this.chart.data;
      return this.options.labels || (this.isHorizontal() ? data.xLabels : data.yLabels) || data.labels || [];
    }
    getLabelItems(chartArea = this.chart.chartArea) {
      const items = this._labelItems || (this._labelItems = this._computeLabelItems(chartArea));
      return items;
    }
    beforeLayout() {
      this._cache = {};
      this._dataLimitsCached = false;
    }
    beforeUpdate() {
      callback(this.options.beforeUpdate, [
        this
      ]);
    }
    update(maxWidth, maxHeight, margins) {
      const { beginAtZero, grace, ticks: tickOpts } = this.options;
      const sampleSize = tickOpts.sampleSize;
      this.beforeUpdate();
      this.maxWidth = maxWidth;
      this.maxHeight = maxHeight;
      this._margins = margins = Object.assign({
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      }, margins);
      this.ticks = null;
      this._labelSizes = null;
      this._gridLineItems = null;
      this._labelItems = null;
      this.beforeSetDimensions();
      this.setDimensions();
      this.afterSetDimensions();
      this._maxLength = this.isHorizontal() ? this.width + margins.left + margins.right : this.height + margins.top + margins.bottom;
      if (!this._dataLimitsCached) {
        this.beforeDataLimits();
        this.determineDataLimits();
        this.afterDataLimits();
        this._range = _addGrace(this, grace, beginAtZero);
        this._dataLimitsCached = true;
      }
      this.beforeBuildTicks();
      this.ticks = this.buildTicks() || [];
      this.afterBuildTicks();
      const samplingEnabled = sampleSize < this.ticks.length;
      this._convertTicksToLabels(samplingEnabled ? sample(this.ticks, sampleSize) : this.ticks);
      this.configure();
      this.beforeCalculateLabelRotation();
      this.calculateLabelRotation();
      this.afterCalculateLabelRotation();
      if (tickOpts.display && (tickOpts.autoSkip || tickOpts.source === "auto")) {
        this.ticks = autoSkip(this, this.ticks);
        this._labelSizes = null;
        this.afterAutoSkip();
      }
      if (samplingEnabled) {
        this._convertTicksToLabels(this.ticks);
      }
      this.beforeFit();
      this.fit();
      this.afterFit();
      this.afterUpdate();
    }
    configure() {
      let reversePixels = this.options.reverse;
      let startPixel, endPixel;
      if (this.isHorizontal()) {
        startPixel = this.left;
        endPixel = this.right;
      } else {
        startPixel = this.top;
        endPixel = this.bottom;
        reversePixels = !reversePixels;
      }
      this._startPixel = startPixel;
      this._endPixel = endPixel;
      this._reversePixels = reversePixels;
      this._length = endPixel - startPixel;
      this._alignToPixels = this.options.alignToPixels;
    }
    afterUpdate() {
      callback(this.options.afterUpdate, [
        this
      ]);
    }
    beforeSetDimensions() {
      callback(this.options.beforeSetDimensions, [
        this
      ]);
    }
    setDimensions() {
      if (this.isHorizontal()) {
        this.width = this.maxWidth;
        this.left = 0;
        this.right = this.width;
      } else {
        this.height = this.maxHeight;
        this.top = 0;
        this.bottom = this.height;
      }
      this.paddingLeft = 0;
      this.paddingTop = 0;
      this.paddingRight = 0;
      this.paddingBottom = 0;
    }
    afterSetDimensions() {
      callback(this.options.afterSetDimensions, [
        this
      ]);
    }
    _callHooks(name2) {
      this.chart.notifyPlugins(name2, this.getContext());
      callback(this.options[name2], [
        this
      ]);
    }
    beforeDataLimits() {
      this._callHooks("beforeDataLimits");
    }
    determineDataLimits() {
    }
    afterDataLimits() {
      this._callHooks("afterDataLimits");
    }
    beforeBuildTicks() {
      this._callHooks("beforeBuildTicks");
    }
    buildTicks() {
      return [];
    }
    afterBuildTicks() {
      this._callHooks("afterBuildTicks");
    }
    beforeTickToLabelConversion() {
      callback(this.options.beforeTickToLabelConversion, [
        this
      ]);
    }
    generateTickLabels(ticks2) {
      const tickOpts = this.options.ticks;
      let i, ilen, tick;
      for (i = 0, ilen = ticks2.length; i < ilen; i++) {
        tick = ticks2[i];
        tick.label = callback(tickOpts.callback, [
          tick.value,
          i,
          ticks2
        ], this);
      }
    }
    afterTickToLabelConversion() {
      callback(this.options.afterTickToLabelConversion, [
        this
      ]);
    }
    beforeCalculateLabelRotation() {
      callback(this.options.beforeCalculateLabelRotation, [
        this
      ]);
    }
    calculateLabelRotation() {
      const options = this.options;
      const tickOpts = options.ticks;
      const numTicks = getTicksLimit(this.ticks.length, options.ticks.maxTicksLimit);
      const minRotation = tickOpts.minRotation || 0;
      const maxRotation = tickOpts.maxRotation;
      let labelRotation = minRotation;
      let tickWidth, maxHeight, maxLabelDiagonal;
      if (!this._isVisible() || !tickOpts.display || minRotation >= maxRotation || numTicks <= 1 || !this.isHorizontal()) {
        this.labelRotation = minRotation;
        return;
      }
      const labelSizes = this._getLabelSizes();
      const maxLabelWidth = labelSizes.widest.width;
      const maxLabelHeight = labelSizes.highest.height;
      const maxWidth = _limitValue(this.chart.width - maxLabelWidth, 0, this.maxWidth);
      tickWidth = options.offset ? this.maxWidth / numTicks : maxWidth / (numTicks - 1);
      if (maxLabelWidth + 6 > tickWidth) {
        tickWidth = maxWidth / (numTicks - (options.offset ? 0.5 : 1));
        maxHeight = this.maxHeight - getTickMarkLength(options.grid) - tickOpts.padding - getTitleHeight(options.title, this.chart.options.font);
        maxLabelDiagonal = Math.sqrt(maxLabelWidth * maxLabelWidth + maxLabelHeight * maxLabelHeight);
        labelRotation = toDegrees(Math.min(Math.asin(_limitValue((labelSizes.highest.height + 6) / tickWidth, -1, 1)), Math.asin(_limitValue(maxHeight / maxLabelDiagonal, -1, 1)) - Math.asin(_limitValue(maxLabelHeight / maxLabelDiagonal, -1, 1))));
        labelRotation = Math.max(minRotation, Math.min(maxRotation, labelRotation));
      }
      this.labelRotation = labelRotation;
    }
    afterCalculateLabelRotation() {
      callback(this.options.afterCalculateLabelRotation, [
        this
      ]);
    }
    afterAutoSkip() {
    }
    beforeFit() {
      callback(this.options.beforeFit, [
        this
      ]);
    }
    fit() {
      const minSize = {
        width: 0,
        height: 0
      };
      const { chart, options: { ticks: tickOpts, title: titleOpts, grid: gridOpts } } = this;
      const display = this._isVisible();
      const isHorizontal = this.isHorizontal();
      if (display) {
        const titleHeight = getTitleHeight(titleOpts, chart.options.font);
        if (isHorizontal) {
          minSize.width = this.maxWidth;
          minSize.height = getTickMarkLength(gridOpts) + titleHeight;
        } else {
          minSize.height = this.maxHeight;
          minSize.width = getTickMarkLength(gridOpts) + titleHeight;
        }
        if (tickOpts.display && this.ticks.length) {
          const { first, last, widest, highest } = this._getLabelSizes();
          const tickPadding = tickOpts.padding * 2;
          const angleRadians = toRadians(this.labelRotation);
          const cos = Math.cos(angleRadians);
          const sin = Math.sin(angleRadians);
          if (isHorizontal) {
            const labelHeight = tickOpts.mirror ? 0 : sin * widest.width + cos * highest.height;
            minSize.height = Math.min(this.maxHeight, minSize.height + labelHeight + tickPadding);
          } else {
            const labelWidth = tickOpts.mirror ? 0 : cos * widest.width + sin * highest.height;
            minSize.width = Math.min(this.maxWidth, minSize.width + labelWidth + tickPadding);
          }
          this._calculatePadding(first, last, sin, cos);
        }
      }
      this._handleMargins();
      if (isHorizontal) {
        this.width = this._length = chart.width - this._margins.left - this._margins.right;
        this.height = minSize.height;
      } else {
        this.width = minSize.width;
        this.height = this._length = chart.height - this._margins.top - this._margins.bottom;
      }
    }
    _calculatePadding(first, last, sin, cos) {
      const { ticks: { align, padding }, position } = this.options;
      const isRotated = this.labelRotation !== 0;
      const labelsBelowTicks = position !== "top" && this.axis === "x";
      if (this.isHorizontal()) {
        const offsetLeft = this.getPixelForTick(0) - this.left;
        const offsetRight = this.right - this.getPixelForTick(this.ticks.length - 1);
        let paddingLeft = 0;
        let paddingRight = 0;
        if (isRotated) {
          if (labelsBelowTicks) {
            paddingLeft = cos * first.width;
            paddingRight = sin * last.height;
          } else {
            paddingLeft = sin * first.height;
            paddingRight = cos * last.width;
          }
        } else if (align === "start") {
          paddingRight = last.width;
        } else if (align === "end") {
          paddingLeft = first.width;
        } else if (align !== "inner") {
          paddingLeft = first.width / 2;
          paddingRight = last.width / 2;
        }
        this.paddingLeft = Math.max((paddingLeft - offsetLeft + padding) * this.width / (this.width - offsetLeft), 0);
        this.paddingRight = Math.max((paddingRight - offsetRight + padding) * this.width / (this.width - offsetRight), 0);
      } else {
        let paddingTop = last.height / 2;
        let paddingBottom = first.height / 2;
        if (align === "start") {
          paddingTop = 0;
          paddingBottom = first.height;
        } else if (align === "end") {
          paddingTop = last.height;
          paddingBottom = 0;
        }
        this.paddingTop = paddingTop + padding;
        this.paddingBottom = paddingBottom + padding;
      }
    }
    _handleMargins() {
      if (this._margins) {
        this._margins.left = Math.max(this.paddingLeft, this._margins.left);
        this._margins.top = Math.max(this.paddingTop, this._margins.top);
        this._margins.right = Math.max(this.paddingRight, this._margins.right);
        this._margins.bottom = Math.max(this.paddingBottom, this._margins.bottom);
      }
    }
    afterFit() {
      callback(this.options.afterFit, [
        this
      ]);
    }
    isHorizontal() {
      const { axis, position } = this.options;
      return position === "top" || position === "bottom" || axis === "x";
    }
    isFullSize() {
      return this.options.fullSize;
    }
    _convertTicksToLabels(ticks2) {
      this.beforeTickToLabelConversion();
      this.generateTickLabels(ticks2);
      let i, ilen;
      for (i = 0, ilen = ticks2.length; i < ilen; i++) {
        if (isNullOrUndef(ticks2[i].label)) {
          ticks2.splice(i, 1);
          ilen--;
          i--;
        }
      }
      this.afterTickToLabelConversion();
    }
    _getLabelSizes() {
      let labelSizes = this._labelSizes;
      if (!labelSizes) {
        const sampleSize = this.options.ticks.sampleSize;
        let ticks2 = this.ticks;
        if (sampleSize < ticks2.length) {
          ticks2 = sample(ticks2, sampleSize);
        }
        this._labelSizes = labelSizes = this._computeLabelSizes(ticks2, ticks2.length, this.options.ticks.maxTicksLimit);
      }
      return labelSizes;
    }
    _computeLabelSizes(ticks2, length, maxTicksLimit) {
      const { ctx, _longestTextCache: caches } = this;
      const widths = [];
      const heights = [];
      const increment = Math.floor(length / getTicksLimit(length, maxTicksLimit));
      let widestLabelSize = 0;
      let highestLabelSize = 0;
      let i, j, jlen, label, tickFont, fontString, cache, lineHeight, width, height, nestedLabel;
      for (i = 0; i < length; i += increment) {
        label = ticks2[i].label;
        tickFont = this._resolveTickFontOptions(i);
        ctx.font = fontString = tickFont.string;
        cache = caches[fontString] = caches[fontString] || {
          data: {},
          gc: []
        };
        lineHeight = tickFont.lineHeight;
        width = height = 0;
        if (!isNullOrUndef(label) && !isArray(label)) {
          width = _measureText(ctx, cache.data, cache.gc, width, label);
          height = lineHeight;
        } else if (isArray(label)) {
          for (j = 0, jlen = label.length; j < jlen; ++j) {
            nestedLabel = label[j];
            if (!isNullOrUndef(nestedLabel) && !isArray(nestedLabel)) {
              width = _measureText(ctx, cache.data, cache.gc, width, nestedLabel);
              height += lineHeight;
            }
          }
        }
        widths.push(width);
        heights.push(height);
        widestLabelSize = Math.max(width, widestLabelSize);
        highestLabelSize = Math.max(height, highestLabelSize);
      }
      garbageCollect(caches, length);
      const widest = widths.indexOf(widestLabelSize);
      const highest = heights.indexOf(highestLabelSize);
      const valueAt = (idx) => ({
        width: widths[idx] || 0,
        height: heights[idx] || 0
      });
      return {
        first: valueAt(0),
        last: valueAt(length - 1),
        widest: valueAt(widest),
        highest: valueAt(highest),
        widths,
        heights
      };
    }
    getLabelForValue(value) {
      return value;
    }
    getPixelForValue(value, index2) {
      return NaN;
    }
    getValueForPixel(pixel) {
    }
    getPixelForTick(index2) {
      const ticks2 = this.ticks;
      if (index2 < 0 || index2 > ticks2.length - 1) {
        return null;
      }
      return this.getPixelForValue(ticks2[index2].value);
    }
    getPixelForDecimal(decimal) {
      if (this._reversePixels) {
        decimal = 1 - decimal;
      }
      const pixel = this._startPixel + decimal * this._length;
      return _int16Range(this._alignToPixels ? _alignPixel(this.chart, pixel, 0) : pixel);
    }
    getDecimalForPixel(pixel) {
      const decimal = (pixel - this._startPixel) / this._length;
      return this._reversePixels ? 1 - decimal : decimal;
    }
    getBasePixel() {
      return this.getPixelForValue(this.getBaseValue());
    }
    getBaseValue() {
      const { min: min2, max: max2 } = this;
      return min2 < 0 && max2 < 0 ? max2 : min2 > 0 && max2 > 0 ? min2 : 0;
    }
    getContext(index2) {
      const ticks2 = this.ticks || [];
      if (index2 >= 0 && index2 < ticks2.length) {
        const tick = ticks2[index2];
        return tick.$context || (tick.$context = createTickContext(this.getContext(), index2, tick));
      }
      return this.$context || (this.$context = createScaleContext(this.chart.getContext(), this));
    }
    _tickSize() {
      const optionTicks = this.options.ticks;
      const rot = toRadians(this.labelRotation);
      const cos = Math.abs(Math.cos(rot));
      const sin = Math.abs(Math.sin(rot));
      const labelSizes = this._getLabelSizes();
      const padding = optionTicks.autoSkipPadding || 0;
      const w = labelSizes ? labelSizes.widest.width + padding : 0;
      const h = labelSizes ? labelSizes.highest.height + padding : 0;
      return this.isHorizontal() ? h * cos > w * sin ? w / cos : h / sin : h * sin < w * cos ? h / cos : w / sin;
    }
    _isVisible() {
      const display = this.options.display;
      if (display !== "auto") {
        return !!display;
      }
      return this.getMatchingVisibleMetas().length > 0;
    }
    _computeGridLineItems(chartArea) {
      const axis = this.axis;
      const chart = this.chart;
      const options = this.options;
      const { grid, position, border } = options;
      const offset = grid.offset;
      const isHorizontal = this.isHorizontal();
      const ticks2 = this.ticks;
      const ticksLength = ticks2.length + (offset ? 1 : 0);
      const tl = getTickMarkLength(grid);
      const items = [];
      const borderOpts = border.setContext(this.getContext());
      const axisWidth = borderOpts.display ? borderOpts.width : 0;
      const axisHalfWidth = axisWidth / 2;
      const alignBorderValue = function(pixel) {
        return _alignPixel(chart, pixel, axisWidth);
      };
      let borderValue, i, lineValue, alignedLineValue;
      let tx1, ty1, tx2, ty2, x1, y1, x2, y2;
      if (position === "top") {
        borderValue = alignBorderValue(this.bottom);
        ty1 = this.bottom - tl;
        ty2 = borderValue - axisHalfWidth;
        y1 = alignBorderValue(chartArea.top) + axisHalfWidth;
        y2 = chartArea.bottom;
      } else if (position === "bottom") {
        borderValue = alignBorderValue(this.top);
        y1 = chartArea.top;
        y2 = alignBorderValue(chartArea.bottom) - axisHalfWidth;
        ty1 = borderValue + axisHalfWidth;
        ty2 = this.top + tl;
      } else if (position === "left") {
        borderValue = alignBorderValue(this.right);
        tx1 = this.right - tl;
        tx2 = borderValue - axisHalfWidth;
        x1 = alignBorderValue(chartArea.left) + axisHalfWidth;
        x2 = chartArea.right;
      } else if (position === "right") {
        borderValue = alignBorderValue(this.left);
        x1 = chartArea.left;
        x2 = alignBorderValue(chartArea.right) - axisHalfWidth;
        tx1 = borderValue + axisHalfWidth;
        tx2 = this.left + tl;
      } else if (axis === "x") {
        if (position === "center") {
          borderValue = alignBorderValue((chartArea.top + chartArea.bottom) / 2 + 0.5);
        } else if (isObject(position)) {
          const positionAxisID = Object.keys(position)[0];
          const value = position[positionAxisID];
          borderValue = alignBorderValue(this.chart.scales[positionAxisID].getPixelForValue(value));
        }
        y1 = chartArea.top;
        y2 = chartArea.bottom;
        ty1 = borderValue + axisHalfWidth;
        ty2 = ty1 + tl;
      } else if (axis === "y") {
        if (position === "center") {
          borderValue = alignBorderValue((chartArea.left + chartArea.right) / 2);
        } else if (isObject(position)) {
          const positionAxisID1 = Object.keys(position)[0];
          const value1 = position[positionAxisID1];
          borderValue = alignBorderValue(this.chart.scales[positionAxisID1].getPixelForValue(value1));
        }
        tx1 = borderValue - axisHalfWidth;
        tx2 = tx1 - tl;
        x1 = chartArea.left;
        x2 = chartArea.right;
      }
      const limit = valueOrDefault(options.ticks.maxTicksLimit, ticksLength);
      const step = Math.max(1, Math.ceil(ticksLength / limit));
      for (i = 0; i < ticksLength; i += step) {
        const context = this.getContext(i);
        const optsAtIndex = grid.setContext(context);
        const optsAtIndexBorder = border.setContext(context);
        const lineWidth = optsAtIndex.lineWidth;
        const lineColor = optsAtIndex.color;
        const borderDash = optsAtIndexBorder.dash || [];
        const borderDashOffset = optsAtIndexBorder.dashOffset;
        const tickWidth = optsAtIndex.tickWidth;
        const tickColor = optsAtIndex.tickColor;
        const tickBorderDash = optsAtIndex.tickBorderDash || [];
        const tickBorderDashOffset = optsAtIndex.tickBorderDashOffset;
        lineValue = getPixelForGridLine(this, i, offset);
        if (lineValue === void 0) {
          continue;
        }
        alignedLineValue = _alignPixel(chart, lineValue, lineWidth);
        if (isHorizontal) {
          tx1 = tx2 = x1 = x2 = alignedLineValue;
        } else {
          ty1 = ty2 = y1 = y2 = alignedLineValue;
        }
        items.push({
          tx1,
          ty1,
          tx2,
          ty2,
          x1,
          y1,
          x2,
          y2,
          width: lineWidth,
          color: lineColor,
          borderDash,
          borderDashOffset,
          tickWidth,
          tickColor,
          tickBorderDash,
          tickBorderDashOffset
        });
      }
      this._ticksLength = ticksLength;
      this._borderValue = borderValue;
      return items;
    }
    _computeLabelItems(chartArea) {
      const axis = this.axis;
      const options = this.options;
      const { position, ticks: optionTicks } = options;
      const isHorizontal = this.isHorizontal();
      const ticks2 = this.ticks;
      const { align, crossAlign, padding, mirror } = optionTicks;
      const tl = getTickMarkLength(options.grid);
      const tickAndPadding = tl + padding;
      const hTickAndPadding = mirror ? -padding : tickAndPadding;
      const rotation = -toRadians(this.labelRotation);
      const items = [];
      let i, ilen, tick, label, x, y, textAlign, pixel, font, lineHeight, lineCount, textOffset;
      let textBaseline = "middle";
      if (position === "top") {
        y = this.bottom - hTickAndPadding;
        textAlign = this._getXAxisLabelAlignment();
      } else if (position === "bottom") {
        y = this.top + hTickAndPadding;
        textAlign = this._getXAxisLabelAlignment();
      } else if (position === "left") {
        const ret = this._getYAxisLabelAlignment(tl);
        textAlign = ret.textAlign;
        x = ret.x;
      } else if (position === "right") {
        const ret1 = this._getYAxisLabelAlignment(tl);
        textAlign = ret1.textAlign;
        x = ret1.x;
      } else if (axis === "x") {
        if (position === "center") {
          y = (chartArea.top + chartArea.bottom) / 2 + tickAndPadding;
        } else if (isObject(position)) {
          const positionAxisID = Object.keys(position)[0];
          const value = position[positionAxisID];
          y = this.chart.scales[positionAxisID].getPixelForValue(value) + tickAndPadding;
        }
        textAlign = this._getXAxisLabelAlignment();
      } else if (axis === "y") {
        if (position === "center") {
          x = (chartArea.left + chartArea.right) / 2 - tickAndPadding;
        } else if (isObject(position)) {
          const positionAxisID1 = Object.keys(position)[0];
          const value1 = position[positionAxisID1];
          x = this.chart.scales[positionAxisID1].getPixelForValue(value1);
        }
        textAlign = this._getYAxisLabelAlignment(tl).textAlign;
      }
      if (axis === "y") {
        if (align === "start") {
          textBaseline = "top";
        } else if (align === "end") {
          textBaseline = "bottom";
        }
      }
      const labelSizes = this._getLabelSizes();
      for (i = 0, ilen = ticks2.length; i < ilen; ++i) {
        tick = ticks2[i];
        label = tick.label;
        const optsAtIndex = optionTicks.setContext(this.getContext(i));
        pixel = this.getPixelForTick(i) + optionTicks.labelOffset;
        font = this._resolveTickFontOptions(i);
        lineHeight = font.lineHeight;
        lineCount = isArray(label) ? label.length : 1;
        const halfCount = lineCount / 2;
        const color3 = optsAtIndex.color;
        const strokeColor = optsAtIndex.textStrokeColor;
        const strokeWidth = optsAtIndex.textStrokeWidth;
        let tickTextAlign = textAlign;
        if (isHorizontal) {
          x = pixel;
          if (textAlign === "inner") {
            if (i === ilen - 1) {
              tickTextAlign = !this.options.reverse ? "right" : "left";
            } else if (i === 0) {
              tickTextAlign = !this.options.reverse ? "left" : "right";
            } else {
              tickTextAlign = "center";
            }
          }
          if (position === "top") {
            if (crossAlign === "near" || rotation !== 0) {
              textOffset = -lineCount * lineHeight + lineHeight / 2;
            } else if (crossAlign === "center") {
              textOffset = -labelSizes.highest.height / 2 - halfCount * lineHeight + lineHeight;
            } else {
              textOffset = -labelSizes.highest.height + lineHeight / 2;
            }
          } else {
            if (crossAlign === "near" || rotation !== 0) {
              textOffset = lineHeight / 2;
            } else if (crossAlign === "center") {
              textOffset = labelSizes.highest.height / 2 - halfCount * lineHeight;
            } else {
              textOffset = labelSizes.highest.height - lineCount * lineHeight;
            }
          }
          if (mirror) {
            textOffset *= -1;
          }
          if (rotation !== 0 && !optsAtIndex.showLabelBackdrop) {
            x += lineHeight / 2 * Math.sin(rotation);
          }
        } else {
          y = pixel;
          textOffset = (1 - lineCount) * lineHeight / 2;
        }
        let backdrop;
        if (optsAtIndex.showLabelBackdrop) {
          const labelPadding = toPadding(optsAtIndex.backdropPadding);
          const height = labelSizes.heights[i];
          const width = labelSizes.widths[i];
          let top = textOffset - labelPadding.top;
          let left = 0 - labelPadding.left;
          switch (textBaseline) {
            case "middle":
              top -= height / 2;
              break;
            case "bottom":
              top -= height;
              break;
          }
          switch (textAlign) {
            case "center":
              left -= width / 2;
              break;
            case "right":
              left -= width;
              break;
          }
          backdrop = {
            left,
            top,
            width: width + labelPadding.width,
            height: height + labelPadding.height,
            color: optsAtIndex.backdropColor
          };
        }
        items.push({
          label,
          font,
          textOffset,
          options: {
            rotation,
            color: color3,
            strokeColor,
            strokeWidth,
            textAlign: tickTextAlign,
            textBaseline,
            translation: [
              x,
              y
            ],
            backdrop
          }
        });
      }
      return items;
    }
    _getXAxisLabelAlignment() {
      const { position, ticks: ticks2 } = this.options;
      const rotation = -toRadians(this.labelRotation);
      if (rotation) {
        return position === "top" ? "left" : "right";
      }
      let align = "center";
      if (ticks2.align === "start") {
        align = "left";
      } else if (ticks2.align === "end") {
        align = "right";
      } else if (ticks2.align === "inner") {
        align = "inner";
      }
      return align;
    }
    _getYAxisLabelAlignment(tl) {
      const { position, ticks: { crossAlign, mirror, padding } } = this.options;
      const labelSizes = this._getLabelSizes();
      const tickAndPadding = tl + padding;
      const widest = labelSizes.widest.width;
      let textAlign;
      let x;
      if (position === "left") {
        if (mirror) {
          x = this.right + padding;
          if (crossAlign === "near") {
            textAlign = "left";
          } else if (crossAlign === "center") {
            textAlign = "center";
            x += widest / 2;
          } else {
            textAlign = "right";
            x += widest;
          }
        } else {
          x = this.right - tickAndPadding;
          if (crossAlign === "near") {
            textAlign = "right";
          } else if (crossAlign === "center") {
            textAlign = "center";
            x -= widest / 2;
          } else {
            textAlign = "left";
            x = this.left;
          }
        }
      } else if (position === "right") {
        if (mirror) {
          x = this.left + padding;
          if (crossAlign === "near") {
            textAlign = "right";
          } else if (crossAlign === "center") {
            textAlign = "center";
            x -= widest / 2;
          } else {
            textAlign = "left";
            x -= widest;
          }
        } else {
          x = this.left + tickAndPadding;
          if (crossAlign === "near") {
            textAlign = "left";
          } else if (crossAlign === "center") {
            textAlign = "center";
            x += widest / 2;
          } else {
            textAlign = "right";
            x = this.right;
          }
        }
      } else {
        textAlign = "right";
      }
      return {
        textAlign,
        x
      };
    }
    _computeLabelArea() {
      if (this.options.ticks.mirror) {
        return;
      }
      const chart = this.chart;
      const position = this.options.position;
      if (position === "left" || position === "right") {
        return {
          top: 0,
          left: this.left,
          bottom: chart.height,
          right: this.right
        };
      }
      if (position === "top" || position === "bottom") {
        return {
          top: this.top,
          left: 0,
          bottom: this.bottom,
          right: chart.width
        };
      }
    }
    drawBackground() {
      const { ctx, options: { backgroundColor }, left, top, width, height } = this;
      if (backgroundColor) {
        ctx.save();
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(left, top, width, height);
        ctx.restore();
      }
    }
    getLineWidthForValue(value) {
      const grid = this.options.grid;
      if (!this._isVisible() || !grid.display) {
        return 0;
      }
      const ticks2 = this.ticks;
      const index2 = ticks2.findIndex((t) => t.value === value);
      if (index2 >= 0) {
        const opts = grid.setContext(this.getContext(index2));
        return opts.lineWidth;
      }
      return 0;
    }
    drawGrid(chartArea) {
      const grid = this.options.grid;
      const ctx = this.ctx;
      const items = this._gridLineItems || (this._gridLineItems = this._computeGridLineItems(chartArea));
      let i, ilen;
      const drawLine = (p1, p2, style) => {
        if (!style.width || !style.color) {
          return;
        }
        ctx.save();
        ctx.lineWidth = style.width;
        ctx.strokeStyle = style.color;
        ctx.setLineDash(style.borderDash || []);
        ctx.lineDashOffset = style.borderDashOffset;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.restore();
      };
      if (grid.display) {
        for (i = 0, ilen = items.length; i < ilen; ++i) {
          const item = items[i];
          if (grid.drawOnChartArea) {
            drawLine({
              x: item.x1,
              y: item.y1
            }, {
              x: item.x2,
              y: item.y2
            }, item);
          }
          if (grid.drawTicks) {
            drawLine({
              x: item.tx1,
              y: item.ty1
            }, {
              x: item.tx2,
              y: item.ty2
            }, {
              color: item.tickColor,
              width: item.tickWidth,
              borderDash: item.tickBorderDash,
              borderDashOffset: item.tickBorderDashOffset
            });
          }
        }
      }
    }
    drawBorder() {
      const { chart, ctx, options: { border, grid } } = this;
      const borderOpts = border.setContext(this.getContext());
      const axisWidth = border.display ? borderOpts.width : 0;
      if (!axisWidth) {
        return;
      }
      const lastLineWidth = grid.setContext(this.getContext(0)).lineWidth;
      const borderValue = this._borderValue;
      let x1, x2, y1, y2;
      if (this.isHorizontal()) {
        x1 = _alignPixel(chart, this.left, axisWidth) - axisWidth / 2;
        x2 = _alignPixel(chart, this.right, lastLineWidth) + lastLineWidth / 2;
        y1 = y2 = borderValue;
      } else {
        y1 = _alignPixel(chart, this.top, axisWidth) - axisWidth / 2;
        y2 = _alignPixel(chart, this.bottom, lastLineWidth) + lastLineWidth / 2;
        x1 = x2 = borderValue;
      }
      ctx.save();
      ctx.lineWidth = borderOpts.width;
      ctx.strokeStyle = borderOpts.color;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    }
    drawLabels(chartArea) {
      const optionTicks = this.options.ticks;
      if (!optionTicks.display) {
        return;
      }
      const ctx = this.ctx;
      const area = this._computeLabelArea();
      if (area) {
        clipArea(ctx, area);
      }
      const items = this.getLabelItems(chartArea);
      for (const item of items) {
        const renderTextOptions = item.options;
        const tickFont = item.font;
        const label = item.label;
        const y = item.textOffset;
        renderText(ctx, label, 0, y, tickFont, renderTextOptions);
      }
      if (area) {
        unclipArea(ctx);
      }
    }
    drawTitle() {
      const { ctx, options: { position, title, reverse } } = this;
      if (!title.display) {
        return;
      }
      const font = toFont(title.font);
      const padding = toPadding(title.padding);
      const align = title.align;
      let offset = font.lineHeight / 2;
      if (position === "bottom" || position === "center" || isObject(position)) {
        offset += padding.bottom;
        if (isArray(title.text)) {
          offset += font.lineHeight * (title.text.length - 1);
        }
      } else {
        offset += padding.top;
      }
      const { titleX, titleY, maxWidth, rotation } = titleArgs(this, offset, position, align);
      renderText(ctx, title.text, 0, 0, font, {
        color: title.color,
        maxWidth,
        rotation,
        textAlign: titleAlign(align, position, reverse),
        textBaseline: "middle",
        translation: [
          titleX,
          titleY
        ]
      });
    }
    draw(chartArea) {
      if (!this._isVisible()) {
        return;
      }
      this.drawBackground();
      this.drawGrid(chartArea);
      this.drawBorder();
      this.drawTitle();
      this.drawLabels(chartArea);
    }
    _layers() {
      const opts = this.options;
      const tz = opts.ticks && opts.ticks.z || 0;
      const gz = valueOrDefault(opts.grid && opts.grid.z, -1);
      const bz = valueOrDefault(opts.border && opts.border.z, 0);
      if (!this._isVisible() || this.draw !== Scale.prototype.draw) {
        return [
          {
            z: tz,
            draw: (chartArea) => {
              this.draw(chartArea);
            }
          }
        ];
      }
      return [
        {
          z: gz,
          draw: (chartArea) => {
            this.drawBackground();
            this.drawGrid(chartArea);
            this.drawTitle();
          }
        },
        {
          z: bz,
          draw: () => {
            this.drawBorder();
          }
        },
        {
          z: tz,
          draw: (chartArea) => {
            this.drawLabels(chartArea);
          }
        }
      ];
    }
    getMatchingVisibleMetas(type2) {
      const metas = this.chart.getSortedVisibleDatasetMetas();
      const axisID = this.axis + "AxisID";
      const result = [];
      let i, ilen;
      for (i = 0, ilen = metas.length; i < ilen; ++i) {
        const meta = metas[i];
        if (meta[axisID] === this.id && (!type2 || meta.type === type2)) {
          result.push(meta);
        }
      }
      return result;
    }
    _resolveTickFontOptions(index2) {
      const opts = this.options.ticks.setContext(this.getContext(index2));
      return toFont(opts.font);
    }
    _maxDigits() {
      const fontSize = this._resolveTickFontOptions(0).lineHeight;
      return (this.isHorizontal() ? this.width : this.height) / fontSize;
    }
  };
  var TypedRegistry = class {
    constructor(type2, scope, override) {
      this.type = type2;
      this.scope = scope;
      this.override = override;
      this.items = /* @__PURE__ */ Object.create(null);
    }
    isForType(type2) {
      return Object.prototype.isPrototypeOf.call(this.type.prototype, type2.prototype);
    }
    register(item) {
      const proto = Object.getPrototypeOf(item);
      let parentScope;
      if (isIChartComponent(proto)) {
        parentScope = this.register(proto);
      }
      const items = this.items;
      const id2 = item.id;
      const scope = this.scope + "." + id2;
      if (!id2) {
        throw new Error("class does not have id: " + item);
      }
      if (id2 in items) {
        return scope;
      }
      items[id2] = item;
      registerDefaults(item, scope, parentScope);
      if (this.override) {
        defaults.override(item.id, item.overrides);
      }
      return scope;
    }
    get(id2) {
      return this.items[id2];
    }
    unregister(item) {
      const items = this.items;
      const id2 = item.id;
      const scope = this.scope;
      if (id2 in items) {
        delete items[id2];
      }
      if (scope && id2 in defaults[scope]) {
        delete defaults[scope][id2];
        if (this.override) {
          delete overrides[id2];
        }
      }
    }
  };
  function registerDefaults(item, scope, parentScope) {
    const itemDefaults = merge(/* @__PURE__ */ Object.create(null), [
      parentScope ? defaults.get(parentScope) : {},
      defaults.get(scope),
      item.defaults
    ]);
    defaults.set(scope, itemDefaults);
    if (item.defaultRoutes) {
      routeDefaults(scope, item.defaultRoutes);
    }
    if (item.descriptors) {
      defaults.describe(scope, item.descriptors);
    }
  }
  function routeDefaults(scope, routes) {
    Object.keys(routes).forEach((property) => {
      const propertyParts = property.split(".");
      const sourceName = propertyParts.pop();
      const sourceScope = [
        scope
      ].concat(propertyParts).join(".");
      const parts = routes[property].split(".");
      const targetName = parts.pop();
      const targetScope = parts.join(".");
      defaults.route(sourceScope, sourceName, targetScope, targetName);
    });
  }
  function isIChartComponent(proto) {
    return "id" in proto && "defaults" in proto;
  }
  var Registry = class {
    constructor() {
      this.controllers = new TypedRegistry(DatasetController, "datasets", true);
      this.elements = new TypedRegistry(Element, "elements");
      this.plugins = new TypedRegistry(Object, "plugins");
      this.scales = new TypedRegistry(Scale, "scales");
      this._typedRegistries = [
        this.controllers,
        this.scales,
        this.elements
      ];
    }
    add(...args) {
      this._each("register", args);
    }
    remove(...args) {
      this._each("unregister", args);
    }
    addControllers(...args) {
      this._each("register", args, this.controllers);
    }
    addElements(...args) {
      this._each("register", args, this.elements);
    }
    addPlugins(...args) {
      this._each("register", args, this.plugins);
    }
    addScales(...args) {
      this._each("register", args, this.scales);
    }
    getController(id2) {
      return this._get(id2, this.controllers, "controller");
    }
    getElement(id2) {
      return this._get(id2, this.elements, "element");
    }
    getPlugin(id2) {
      return this._get(id2, this.plugins, "plugin");
    }
    getScale(id2) {
      return this._get(id2, this.scales, "scale");
    }
    removeControllers(...args) {
      this._each("unregister", args, this.controllers);
    }
    removeElements(...args) {
      this._each("unregister", args, this.elements);
    }
    removePlugins(...args) {
      this._each("unregister", args, this.plugins);
    }
    removeScales(...args) {
      this._each("unregister", args, this.scales);
    }
    _each(method, args, typedRegistry) {
      [
        ...args
      ].forEach((arg) => {
        const reg = typedRegistry || this._getRegistryForType(arg);
        if (typedRegistry || reg.isForType(arg) || reg === this.plugins && arg.id) {
          this._exec(method, reg, arg);
        } else {
          each(arg, (item) => {
            const itemReg = typedRegistry || this._getRegistryForType(item);
            this._exec(method, itemReg, item);
          });
        }
      });
    }
    _exec(method, registry2, component) {
      const camelMethod = _capitalize(method);
      callback(component["before" + camelMethod], [], component);
      registry2[method](component);
      callback(component["after" + camelMethod], [], component);
    }
    _getRegistryForType(type2) {
      for (let i = 0; i < this._typedRegistries.length; i++) {
        const reg = this._typedRegistries[i];
        if (reg.isForType(type2)) {
          return reg;
        }
      }
      return this.plugins;
    }
    _get(id2, typedRegistry, type2) {
      const item = typedRegistry.get(id2);
      if (item === void 0) {
        throw new Error('"' + id2 + '" is not a registered ' + type2 + ".");
      }
      return item;
    }
  };
  var registry = /* @__PURE__ */ new Registry();
  var PluginService = class {
    constructor() {
      this._init = [];
    }
    notify(chart, hook, args, filter2) {
      if (hook === "beforeInit") {
        this._init = this._createDescriptors(chart, true);
        this._notify(this._init, chart, "install");
      }
      const descriptors2 = filter2 ? this._descriptors(chart).filter(filter2) : this._descriptors(chart);
      const result = this._notify(descriptors2, chart, hook, args);
      if (hook === "afterDestroy") {
        this._notify(descriptors2, chart, "stop");
        this._notify(this._init, chart, "uninstall");
      }
      return result;
    }
    _notify(descriptors2, chart, hook, args) {
      args = args || {};
      for (const descriptor of descriptors2) {
        const plugin = descriptor.plugin;
        const method = plugin[hook];
        const params = [
          chart,
          args,
          descriptor.options
        ];
        if (callback(method, params, plugin) === false && args.cancelable) {
          return false;
        }
      }
      return true;
    }
    invalidate() {
      if (!isNullOrUndef(this._cache)) {
        this._oldCache = this._cache;
        this._cache = void 0;
      }
    }
    _descriptors(chart) {
      if (this._cache) {
        return this._cache;
      }
      const descriptors2 = this._cache = this._createDescriptors(chart);
      this._notifyStateChanges(chart);
      return descriptors2;
    }
    _createDescriptors(chart, all) {
      const config = chart && chart.config;
      const options = valueOrDefault(config.options && config.options.plugins, {});
      const plugins2 = allPlugins(config);
      return options === false && !all ? [] : createDescriptors(chart, plugins2, options, all);
    }
    _notifyStateChanges(chart) {
      const previousDescriptors = this._oldCache || [];
      const descriptors2 = this._cache;
      const diff = (a, b) => a.filter((x) => !b.some((y) => x.plugin.id === y.plugin.id));
      this._notify(diff(previousDescriptors, descriptors2), chart, "stop");
      this._notify(diff(descriptors2, previousDescriptors), chart, "start");
    }
  };
  function allPlugins(config) {
    const localIds = {};
    const plugins2 = [];
    const keys = Object.keys(registry.plugins.items);
    for (let i = 0; i < keys.length; i++) {
      plugins2.push(registry.getPlugin(keys[i]));
    }
    const local = config.plugins || [];
    for (let i1 = 0; i1 < local.length; i1++) {
      const plugin = local[i1];
      if (plugins2.indexOf(plugin) === -1) {
        plugins2.push(plugin);
        localIds[plugin.id] = true;
      }
    }
    return {
      plugins: plugins2,
      localIds
    };
  }
  function getOpts(options, all) {
    if (!all && options === false) {
      return null;
    }
    if (options === true) {
      return {};
    }
    return options;
  }
  function createDescriptors(chart, { plugins: plugins2, localIds }, options, all) {
    const result = [];
    const context = chart.getContext();
    for (const plugin of plugins2) {
      const id2 = plugin.id;
      const opts = getOpts(options[id2], all);
      if (opts === null) {
        continue;
      }
      result.push({
        plugin,
        options: pluginOpts(chart.config, {
          plugin,
          local: localIds[id2]
        }, opts, context)
      });
    }
    return result;
  }
  function pluginOpts(config, { plugin, local }, opts, context) {
    const keys = config.pluginScopeKeys(plugin);
    const scopes = config.getOptionScopes(opts, keys);
    if (local && plugin.defaults) {
      scopes.push(plugin.defaults);
    }
    return config.createResolver(scopes, context, [
      ""
    ], {
      scriptable: false,
      indexable: false,
      allKeys: true
    });
  }
  function getIndexAxis(type2, options) {
    const datasetDefaults = defaults.datasets[type2] || {};
    const datasetOptions = (options.datasets || {})[type2] || {};
    return datasetOptions.indexAxis || options.indexAxis || datasetDefaults.indexAxis || "x";
  }
  function getAxisFromDefaultScaleID(id2, indexAxis) {
    let axis = id2;
    if (id2 === "_index_") {
      axis = indexAxis;
    } else if (id2 === "_value_") {
      axis = indexAxis === "x" ? "y" : "x";
    }
    return axis;
  }
  function getDefaultScaleIDFromAxis(axis, indexAxis) {
    return axis === indexAxis ? "_index_" : "_value_";
  }
  function axisFromPosition(position) {
    if (position === "top" || position === "bottom") {
      return "x";
    }
    if (position === "left" || position === "right") {
      return "y";
    }
  }
  function determineAxis(id2, scaleOptions) {
    if (id2 === "x" || id2 === "y" || id2 === "r") {
      return id2;
    }
    id2 = scaleOptions.axis || axisFromPosition(scaleOptions.position) || id2.length > 1 && determineAxis(id2[0].toLowerCase(), scaleOptions);
    if (id2) {
      return id2;
    }
    throw new Error(`Cannot determine type of '${name}' axis. Please provide 'axis' or 'position' option.`);
  }
  function mergeScaleConfig(config, options) {
    const chartDefaults = overrides[config.type] || {
      scales: {}
    };
    const configScales = options.scales || {};
    const chartIndexAxis = getIndexAxis(config.type, options);
    const scales2 = /* @__PURE__ */ Object.create(null);
    Object.keys(configScales).forEach((id2) => {
      const scaleConf = configScales[id2];
      if (!isObject(scaleConf)) {
        return console.error(`Invalid scale configuration for scale: ${id2}`);
      }
      if (scaleConf._proxy) {
        return console.warn(`Ignoring resolver passed as options for scale: ${id2}`);
      }
      const axis = determineAxis(id2, scaleConf);
      const defaultId = getDefaultScaleIDFromAxis(axis, chartIndexAxis);
      const defaultScaleOptions = chartDefaults.scales || {};
      scales2[id2] = mergeIf(/* @__PURE__ */ Object.create(null), [
        {
          axis
        },
        scaleConf,
        defaultScaleOptions[axis],
        defaultScaleOptions[defaultId]
      ]);
    });
    config.data.datasets.forEach((dataset) => {
      const type2 = dataset.type || config.type;
      const indexAxis = dataset.indexAxis || getIndexAxis(type2, options);
      const datasetDefaults = overrides[type2] || {};
      const defaultScaleOptions = datasetDefaults.scales || {};
      Object.keys(defaultScaleOptions).forEach((defaultID) => {
        const axis = getAxisFromDefaultScaleID(defaultID, indexAxis);
        const id2 = dataset[axis + "AxisID"] || axis;
        scales2[id2] = scales2[id2] || /* @__PURE__ */ Object.create(null);
        mergeIf(scales2[id2], [
          {
            axis
          },
          configScales[id2],
          defaultScaleOptions[defaultID]
        ]);
      });
    });
    Object.keys(scales2).forEach((key) => {
      const scale = scales2[key];
      mergeIf(scale, [
        defaults.scales[scale.type],
        defaults.scale
      ]);
    });
    return scales2;
  }
  function initOptions(config) {
    const options = config.options || (config.options = {});
    options.plugins = valueOrDefault(options.plugins, {});
    options.scales = mergeScaleConfig(config, options);
  }
  function initData(data) {
    data = data || {};
    data.datasets = data.datasets || [];
    data.labels = data.labels || [];
    return data;
  }
  function initConfig(config) {
    config = config || {};
    config.data = initData(config.data);
    initOptions(config);
    return config;
  }
  var keyCache = /* @__PURE__ */ new Map();
  var keysCached = /* @__PURE__ */ new Set();
  function cachedKeys(cacheKey, generate) {
    let keys = keyCache.get(cacheKey);
    if (!keys) {
      keys = generate();
      keyCache.set(cacheKey, keys);
      keysCached.add(keys);
    }
    return keys;
  }
  var addIfFound = (set4, obj, key) => {
    const opts = resolveObjectKey(obj, key);
    if (opts !== void 0) {
      set4.add(opts);
    }
  };
  var Config = class {
    constructor(config) {
      this._config = initConfig(config);
      this._scopeCache = /* @__PURE__ */ new Map();
      this._resolverCache = /* @__PURE__ */ new Map();
    }
    get platform() {
      return this._config.platform;
    }
    get type() {
      return this._config.type;
    }
    set type(type2) {
      this._config.type = type2;
    }
    get data() {
      return this._config.data;
    }
    set data(data) {
      this._config.data = initData(data);
    }
    get options() {
      return this._config.options;
    }
    set options(options) {
      this._config.options = options;
    }
    get plugins() {
      return this._config.plugins;
    }
    update() {
      const config = this._config;
      this.clearCache();
      initOptions(config);
    }
    clearCache() {
      this._scopeCache.clear();
      this._resolverCache.clear();
    }
    datasetScopeKeys(datasetType) {
      return cachedKeys(datasetType, () => [
        [
          `datasets.${datasetType}`,
          ""
        ]
      ]);
    }
    datasetAnimationScopeKeys(datasetType, transition2) {
      return cachedKeys(`${datasetType}.transition.${transition2}`, () => [
        [
          `datasets.${datasetType}.transitions.${transition2}`,
          `transitions.${transition2}`
        ],
        [
          `datasets.${datasetType}`,
          ""
        ]
      ]);
    }
    datasetElementScopeKeys(datasetType, elementType) {
      return cachedKeys(`${datasetType}-${elementType}`, () => [
        [
          `datasets.${datasetType}.elements.${elementType}`,
          `datasets.${datasetType}`,
          `elements.${elementType}`,
          ""
        ]
      ]);
    }
    pluginScopeKeys(plugin) {
      const id2 = plugin.id;
      const type2 = this.type;
      return cachedKeys(`${type2}-plugin-${id2}`, () => [
        [
          `plugins.${id2}`,
          ...plugin.additionalOptionScopes || []
        ]
      ]);
    }
    _cachedScopes(mainScope, resetCache) {
      const _scopeCache = this._scopeCache;
      let cache = _scopeCache.get(mainScope);
      if (!cache || resetCache) {
        cache = /* @__PURE__ */ new Map();
        _scopeCache.set(mainScope, cache);
      }
      return cache;
    }
    getOptionScopes(mainScope, keyLists, resetCache) {
      const { options, type: type2 } = this;
      const cache = this._cachedScopes(mainScope, resetCache);
      const cached = cache.get(keyLists);
      if (cached) {
        return cached;
      }
      const scopes = /* @__PURE__ */ new Set();
      keyLists.forEach((keys) => {
        if (mainScope) {
          scopes.add(mainScope);
          keys.forEach((key) => addIfFound(scopes, mainScope, key));
        }
        keys.forEach((key) => addIfFound(scopes, options, key));
        keys.forEach((key) => addIfFound(scopes, overrides[type2] || {}, key));
        keys.forEach((key) => addIfFound(scopes, defaults, key));
        keys.forEach((key) => addIfFound(scopes, descriptors, key));
      });
      const array2 = Array.from(scopes);
      if (array2.length === 0) {
        array2.push(/* @__PURE__ */ Object.create(null));
      }
      if (keysCached.has(keyLists)) {
        cache.set(keyLists, array2);
      }
      return array2;
    }
    chartOptionScopes() {
      const { options, type: type2 } = this;
      return [
        options,
        overrides[type2] || {},
        defaults.datasets[type2] || {},
        {
          type: type2
        },
        defaults,
        descriptors
      ];
    }
    resolveNamedOptions(scopes, names2, context, prefixes2 = [
      ""
    ]) {
      const result = {
        $shared: true
      };
      const { resolver, subPrefixes } = getResolver(this._resolverCache, scopes, prefixes2);
      let options = resolver;
      if (needContext(resolver, names2)) {
        result.$shared = false;
        context = isFunction(context) ? context() : context;
        const subResolver = this.createResolver(scopes, context, subPrefixes);
        options = _attachContext(resolver, context, subResolver);
      }
      for (const prop of names2) {
        result[prop] = options[prop];
      }
      return result;
    }
    createResolver(scopes, context, prefixes2 = [
      ""
    ], descriptorDefaults) {
      const { resolver } = getResolver(this._resolverCache, scopes, prefixes2);
      return isObject(context) ? _attachContext(resolver, context, void 0, descriptorDefaults) : resolver;
    }
  };
  function getResolver(resolverCache, scopes, prefixes2) {
    let cache = resolverCache.get(scopes);
    if (!cache) {
      cache = /* @__PURE__ */ new Map();
      resolverCache.set(scopes, cache);
    }
    const cacheKey = prefixes2.join();
    let cached = cache.get(cacheKey);
    if (!cached) {
      const resolver = _createResolver(scopes, prefixes2);
      cached = {
        resolver,
        subPrefixes: prefixes2.filter((p) => !p.toLowerCase().includes("hover"))
      };
      cache.set(cacheKey, cached);
    }
    return cached;
  }
  var hasFunction = (value) => isObject(value) && Object.getOwnPropertyNames(value).reduce((acc, key) => acc || isFunction(value[key]), false);
  function needContext(proxy, names2) {
    const { isScriptable, isIndexable } = _descriptors(proxy);
    for (const prop of names2) {
      const scriptable = isScriptable(prop);
      const indexable = isIndexable(prop);
      const value = (indexable || scriptable) && proxy[prop];
      if (scriptable && (isFunction(value) || hasFunction(value)) || indexable && isArray(value)) {
        return true;
      }
    }
    return false;
  }
  var version = "4.2.1";
  var KNOWN_POSITIONS = [
    "top",
    "bottom",
    "left",
    "right",
    "chartArea"
  ];
  function positionIsHorizontal(position, axis) {
    return position === "top" || position === "bottom" || KNOWN_POSITIONS.indexOf(position) === -1 && axis === "x";
  }
  function compare2Level(l1, l2) {
    return function(a, b) {
      return a[l1] === b[l1] ? a[l2] - b[l2] : a[l1] - b[l1];
    };
  }
  function onAnimationsComplete(context) {
    const chart = context.chart;
    const animationOptions = chart.options.animation;
    chart.notifyPlugins("afterRender");
    callback(animationOptions && animationOptions.onComplete, [
      context
    ], chart);
  }
  function onAnimationProgress(context) {
    const chart = context.chart;
    const animationOptions = chart.options.animation;
    callback(animationOptions && animationOptions.onProgress, [
      context
    ], chart);
  }
  function getCanvas(item) {
    if (_isDomSupported() && typeof item === "string") {
      item = document.getElementById(item);
    } else if (item && item.length) {
      item = item[0];
    }
    if (item && item.canvas) {
      item = item.canvas;
    }
    return item;
  }
  var instances = {};
  var getChart = (key) => {
    const canvas = getCanvas(key);
    return Object.values(instances).filter((c) => c.canvas === canvas).pop();
  };
  function moveNumericKeys(obj, start2, move) {
    const keys = Object.keys(obj);
    for (const key of keys) {
      const intKey = +key;
      if (intKey >= start2) {
        const value = obj[key];
        delete obj[key];
        if (move > 0 || intKey > start2) {
          obj[intKey + move] = value;
        }
      }
    }
  }
  function determineLastEvent(e, lastEvent, inChartArea, isClick) {
    if (!inChartArea || e.type === "mouseout") {
      return null;
    }
    if (isClick) {
      return lastEvent;
    }
    return e;
  }
  function getDatasetArea(meta) {
    const { xScale, yScale } = meta;
    if (xScale && yScale) {
      return {
        left: xScale.left,
        right: xScale.right,
        top: yScale.top,
        bottom: yScale.bottom
      };
    }
  }
  var Chart = class {
    static register(...items) {
      registry.add(...items);
      invalidatePlugins();
    }
    static unregister(...items) {
      registry.remove(...items);
      invalidatePlugins();
    }
    constructor(item, userConfig) {
      const config = this.config = new Config(userConfig);
      const initialCanvas = getCanvas(item);
      const existingChart = getChart(initialCanvas);
      if (existingChart) {
        throw new Error("Canvas is already in use. Chart with ID '" + existingChart.id + "' must be destroyed before the canvas with ID '" + existingChart.canvas.id + "' can be reused.");
      }
      const options = config.createResolver(config.chartOptionScopes(), this.getContext());
      this.platform = new (config.platform || _detectPlatform(initialCanvas))();
      this.platform.updateConfig(config);
      const context = this.platform.acquireContext(initialCanvas, options.aspectRatio);
      const canvas = context && context.canvas;
      const height = canvas && canvas.height;
      const width = canvas && canvas.width;
      this.id = uid();
      this.ctx = context;
      this.canvas = canvas;
      this.width = width;
      this.height = height;
      this._options = options;
      this._aspectRatio = this.aspectRatio;
      this._layers = [];
      this._metasets = [];
      this._stacks = void 0;
      this.boxes = [];
      this.currentDevicePixelRatio = void 0;
      this.chartArea = void 0;
      this._active = [];
      this._lastEvent = void 0;
      this._listeners = {};
      this._responsiveListeners = void 0;
      this._sortedMetasets = [];
      this.scales = {};
      this._plugins = new PluginService();
      this.$proxies = {};
      this._hiddenIndices = {};
      this.attached = false;
      this._animationsDisabled = void 0;
      this.$context = void 0;
      this._doResize = debounce((mode) => this.update(mode), options.resizeDelay || 0);
      this._dataChanges = [];
      instances[this.id] = this;
      if (!context || !canvas) {
        console.error("Failed to create chart: can't acquire context from the given item");
        return;
      }
      animator.listen(this, "complete", onAnimationsComplete);
      animator.listen(this, "progress", onAnimationProgress);
      this._initialize();
      if (this.attached) {
        this.update();
      }
    }
    get aspectRatio() {
      const { options: { aspectRatio, maintainAspectRatio }, width, height, _aspectRatio } = this;
      if (!isNullOrUndef(aspectRatio)) {
        return aspectRatio;
      }
      if (maintainAspectRatio && _aspectRatio) {
        return _aspectRatio;
      }
      return height ? width / height : null;
    }
    get data() {
      return this.config.data;
    }
    set data(data) {
      this.config.data = data;
    }
    get options() {
      return this._options;
    }
    set options(options) {
      this.config.options = options;
    }
    get registry() {
      return registry;
    }
    _initialize() {
      this.notifyPlugins("beforeInit");
      if (this.options.responsive) {
        this.resize();
      } else {
        retinaScale(this, this.options.devicePixelRatio);
      }
      this.bindEvents();
      this.notifyPlugins("afterInit");
      return this;
    }
    clear() {
      clearCanvas(this.canvas, this.ctx);
      return this;
    }
    stop() {
      animator.stop(this);
      return this;
    }
    resize(width, height) {
      if (!animator.running(this)) {
        this._resize(width, height);
      } else {
        this._resizeBeforeDraw = {
          width,
          height
        };
      }
    }
    _resize(width, height) {
      const options = this.options;
      const canvas = this.canvas;
      const aspectRatio = options.maintainAspectRatio && this.aspectRatio;
      const newSize = this.platform.getMaximumSize(canvas, width, height, aspectRatio);
      const newRatio = options.devicePixelRatio || this.platform.getDevicePixelRatio();
      const mode = this.width ? "resize" : "attach";
      this.width = newSize.width;
      this.height = newSize.height;
      this._aspectRatio = this.aspectRatio;
      if (!retinaScale(this, newRatio, true)) {
        return;
      }
      this.notifyPlugins("resize", {
        size: newSize
      });
      callback(options.onResize, [
        this,
        newSize
      ], this);
      if (this.attached) {
        if (this._doResize(mode)) {
          this.render();
        }
      }
    }
    ensureScalesHaveIDs() {
      const options = this.options;
      const scalesOptions = options.scales || {};
      each(scalesOptions, (axisOptions, axisID) => {
        axisOptions.id = axisID;
      });
    }
    buildOrUpdateScales() {
      const options = this.options;
      const scaleOpts = options.scales;
      const scales2 = this.scales;
      const updated = Object.keys(scales2).reduce((obj, id2) => {
        obj[id2] = false;
        return obj;
      }, {});
      let items = [];
      if (scaleOpts) {
        items = items.concat(Object.keys(scaleOpts).map((id2) => {
          const scaleOptions = scaleOpts[id2];
          const axis = determineAxis(id2, scaleOptions);
          const isRadial = axis === "r";
          const isHorizontal = axis === "x";
          return {
            options: scaleOptions,
            dposition: isRadial ? "chartArea" : isHorizontal ? "bottom" : "left",
            dtype: isRadial ? "radialLinear" : isHorizontal ? "category" : "linear"
          };
        }));
      }
      each(items, (item) => {
        const scaleOptions = item.options;
        const id2 = scaleOptions.id;
        const axis = determineAxis(id2, scaleOptions);
        const scaleType = valueOrDefault(scaleOptions.type, item.dtype);
        if (scaleOptions.position === void 0 || positionIsHorizontal(scaleOptions.position, axis) !== positionIsHorizontal(item.dposition)) {
          scaleOptions.position = item.dposition;
        }
        updated[id2] = true;
        let scale = null;
        if (id2 in scales2 && scales2[id2].type === scaleType) {
          scale = scales2[id2];
        } else {
          const scaleClass = registry.getScale(scaleType);
          scale = new scaleClass({
            id: id2,
            type: scaleType,
            ctx: this.ctx,
            chart: this
          });
          scales2[scale.id] = scale;
        }
        scale.init(scaleOptions, options);
      });
      each(updated, (hasUpdated, id2) => {
        if (!hasUpdated) {
          delete scales2[id2];
        }
      });
      each(scales2, (scale) => {
        layouts.configure(this, scale, scale.options);
        layouts.addBox(this, scale);
      });
    }
    _updateMetasets() {
      const metasets = this._metasets;
      const numData = this.data.datasets.length;
      const numMeta = metasets.length;
      metasets.sort((a, b) => a.index - b.index);
      if (numMeta > numData) {
        for (let i = numData; i < numMeta; ++i) {
          this._destroyDatasetMeta(i);
        }
        metasets.splice(numData, numMeta - numData);
      }
      this._sortedMetasets = metasets.slice(0).sort(compare2Level("order", "index"));
    }
    _removeUnreferencedMetasets() {
      const { _metasets: metasets, data: { datasets } } = this;
      if (metasets.length > datasets.length) {
        delete this._stacks;
      }
      metasets.forEach((meta, index2) => {
        if (datasets.filter((x) => x === meta._dataset).length === 0) {
          this._destroyDatasetMeta(index2);
        }
      });
    }
    buildOrUpdateControllers() {
      const newControllers = [];
      const datasets = this.data.datasets;
      let i, ilen;
      this._removeUnreferencedMetasets();
      for (i = 0, ilen = datasets.length; i < ilen; i++) {
        const dataset = datasets[i];
        let meta = this.getDatasetMeta(i);
        const type2 = dataset.type || this.config.type;
        if (meta.type && meta.type !== type2) {
          this._destroyDatasetMeta(i);
          meta = this.getDatasetMeta(i);
        }
        meta.type = type2;
        meta.indexAxis = dataset.indexAxis || getIndexAxis(type2, this.options);
        meta.order = dataset.order || 0;
        meta.index = i;
        meta.label = "" + dataset.label;
        meta.visible = this.isDatasetVisible(i);
        if (meta.controller) {
          meta.controller.updateIndex(i);
          meta.controller.linkScales();
        } else {
          const ControllerClass = registry.getController(type2);
          const { datasetElementType, dataElementType } = defaults.datasets[type2];
          Object.assign(ControllerClass, {
            dataElementType: registry.getElement(dataElementType),
            datasetElementType: datasetElementType && registry.getElement(datasetElementType)
          });
          meta.controller = new ControllerClass(this, i);
          newControllers.push(meta.controller);
        }
      }
      this._updateMetasets();
      return newControllers;
    }
    _resetElements() {
      each(this.data.datasets, (dataset, datasetIndex) => {
        this.getDatasetMeta(datasetIndex).controller.reset();
      }, this);
    }
    reset() {
      this._resetElements();
      this.notifyPlugins("reset");
    }
    update(mode) {
      const config = this.config;
      config.update();
      const options = this._options = config.createResolver(config.chartOptionScopes(), this.getContext());
      const animsDisabled = this._animationsDisabled = !options.animation;
      this._updateScales();
      this._checkEventBindings();
      this._updateHiddenIndices();
      this._plugins.invalidate();
      if (this.notifyPlugins("beforeUpdate", {
        mode,
        cancelable: true
      }) === false) {
        return;
      }
      const newControllers = this.buildOrUpdateControllers();
      this.notifyPlugins("beforeElementsUpdate");
      let minPadding = 0;
      for (let i = 0, ilen = this.data.datasets.length; i < ilen; i++) {
        const { controller } = this.getDatasetMeta(i);
        const reset = !animsDisabled && newControllers.indexOf(controller) === -1;
        controller.buildOrUpdateElements(reset);
        minPadding = Math.max(+controller.getMaxOverflow(), minPadding);
      }
      minPadding = this._minPadding = options.layout.autoPadding ? minPadding : 0;
      this._updateLayout(minPadding);
      if (!animsDisabled) {
        each(newControllers, (controller) => {
          controller.reset();
        });
      }
      this._updateDatasets(mode);
      this.notifyPlugins("afterUpdate", {
        mode
      });
      this._layers.sort(compare2Level("z", "_idx"));
      const { _active, _lastEvent } = this;
      if (_lastEvent) {
        this._eventHandler(_lastEvent, true);
      } else if (_active.length) {
        this._updateHoverStyles(_active, _active, true);
      }
      this.render();
    }
    _updateScales() {
      each(this.scales, (scale) => {
        layouts.removeBox(this, scale);
      });
      this.ensureScalesHaveIDs();
      this.buildOrUpdateScales();
    }
    _checkEventBindings() {
      const options = this.options;
      const existingEvents = new Set(Object.keys(this._listeners));
      const newEvents = new Set(options.events);
      if (!setsEqual(existingEvents, newEvents) || !!this._responsiveListeners !== options.responsive) {
        this.unbindEvents();
        this.bindEvents();
      }
    }
    _updateHiddenIndices() {
      const { _hiddenIndices } = this;
      const changes = this._getUniformDataChanges() || [];
      for (const { method, start: start2, count } of changes) {
        const move = method === "_removeElements" ? -count : count;
        moveNumericKeys(_hiddenIndices, start2, move);
      }
    }
    _getUniformDataChanges() {
      const _dataChanges = this._dataChanges;
      if (!_dataChanges || !_dataChanges.length) {
        return;
      }
      this._dataChanges = [];
      const datasetCount = this.data.datasets.length;
      const makeSet = (idx) => new Set(_dataChanges.filter((c) => c[0] === idx).map((c, i) => i + "," + c.splice(1).join(",")));
      const changeSet = makeSet(0);
      for (let i = 1; i < datasetCount; i++) {
        if (!setsEqual(changeSet, makeSet(i))) {
          return;
        }
      }
      return Array.from(changeSet).map((c) => c.split(",")).map((a) => ({
        method: a[1],
        start: +a[2],
        count: +a[3]
      }));
    }
    _updateLayout(minPadding) {
      if (this.notifyPlugins("beforeLayout", {
        cancelable: true
      }) === false) {
        return;
      }
      layouts.update(this, this.width, this.height, minPadding);
      const area = this.chartArea;
      const noArea = area.width <= 0 || area.height <= 0;
      this._layers = [];
      each(this.boxes, (box) => {
        if (noArea && box.position === "chartArea") {
          return;
        }
        if (box.configure) {
          box.configure();
        }
        this._layers.push(...box._layers());
      }, this);
      this._layers.forEach((item, index2) => {
        item._idx = index2;
      });
      this.notifyPlugins("afterLayout");
    }
    _updateDatasets(mode) {
      if (this.notifyPlugins("beforeDatasetsUpdate", {
        mode,
        cancelable: true
      }) === false) {
        return;
      }
      for (let i = 0, ilen = this.data.datasets.length; i < ilen; ++i) {
        this.getDatasetMeta(i).controller.configure();
      }
      for (let i1 = 0, ilen1 = this.data.datasets.length; i1 < ilen1; ++i1) {
        this._updateDataset(i1, isFunction(mode) ? mode({
          datasetIndex: i1
        }) : mode);
      }
      this.notifyPlugins("afterDatasetsUpdate", {
        mode
      });
    }
    _updateDataset(index2, mode) {
      const meta = this.getDatasetMeta(index2);
      const args = {
        meta,
        index: index2,
        mode,
        cancelable: true
      };
      if (this.notifyPlugins("beforeDatasetUpdate", args) === false) {
        return;
      }
      meta.controller._update(mode);
      args.cancelable = false;
      this.notifyPlugins("afterDatasetUpdate", args);
    }
    render() {
      if (this.notifyPlugins("beforeRender", {
        cancelable: true
      }) === false) {
        return;
      }
      if (animator.has(this)) {
        if (this.attached && !animator.running(this)) {
          animator.start(this);
        }
      } else {
        this.draw();
        onAnimationsComplete({
          chart: this
        });
      }
    }
    draw() {
      let i;
      if (this._resizeBeforeDraw) {
        const { width, height } = this._resizeBeforeDraw;
        this._resize(width, height);
        this._resizeBeforeDraw = null;
      }
      this.clear();
      if (this.width <= 0 || this.height <= 0) {
        return;
      }
      if (this.notifyPlugins("beforeDraw", {
        cancelable: true
      }) === false) {
        return;
      }
      const layers = this._layers;
      for (i = 0; i < layers.length && layers[i].z <= 0; ++i) {
        layers[i].draw(this.chartArea);
      }
      this._drawDatasets();
      for (; i < layers.length; ++i) {
        layers[i].draw(this.chartArea);
      }
      this.notifyPlugins("afterDraw");
    }
    _getSortedDatasetMetas(filterVisible) {
      const metasets = this._sortedMetasets;
      const result = [];
      let i, ilen;
      for (i = 0, ilen = metasets.length; i < ilen; ++i) {
        const meta = metasets[i];
        if (!filterVisible || meta.visible) {
          result.push(meta);
        }
      }
      return result;
    }
    getSortedVisibleDatasetMetas() {
      return this._getSortedDatasetMetas(true);
    }
    _drawDatasets() {
      if (this.notifyPlugins("beforeDatasetsDraw", {
        cancelable: true
      }) === false) {
        return;
      }
      const metasets = this.getSortedVisibleDatasetMetas();
      for (let i = metasets.length - 1; i >= 0; --i) {
        this._drawDataset(metasets[i]);
      }
      this.notifyPlugins("afterDatasetsDraw");
    }
    _drawDataset(meta) {
      const ctx = this.ctx;
      const clip = meta._clip;
      const useClip = !clip.disabled;
      const area = getDatasetArea(meta) || this.chartArea;
      const args = {
        meta,
        index: meta.index,
        cancelable: true
      };
      if (this.notifyPlugins("beforeDatasetDraw", args) === false) {
        return;
      }
      if (useClip) {
        clipArea(ctx, {
          left: clip.left === false ? 0 : area.left - clip.left,
          right: clip.right === false ? this.width : area.right + clip.right,
          top: clip.top === false ? 0 : area.top - clip.top,
          bottom: clip.bottom === false ? this.height : area.bottom + clip.bottom
        });
      }
      meta.controller.draw();
      if (useClip) {
        unclipArea(ctx);
      }
      args.cancelable = false;
      this.notifyPlugins("afterDatasetDraw", args);
    }
    isPointInArea(point) {
      return _isPointInArea(point, this.chartArea, this._minPadding);
    }
    getElementsAtEventForMode(e, mode, options, useFinalPosition) {
      const method = Interaction.modes[mode];
      if (typeof method === "function") {
        return method(this, e, options, useFinalPosition);
      }
      return [];
    }
    getDatasetMeta(datasetIndex) {
      const dataset = this.data.datasets[datasetIndex];
      const metasets = this._metasets;
      let meta = metasets.filter((x) => x && x._dataset === dataset).pop();
      if (!meta) {
        meta = {
          type: null,
          data: [],
          dataset: null,
          controller: null,
          hidden: null,
          xAxisID: null,
          yAxisID: null,
          order: dataset && dataset.order || 0,
          index: datasetIndex,
          _dataset: dataset,
          _parsed: [],
          _sorted: false
        };
        metasets.push(meta);
      }
      return meta;
    }
    getContext() {
      return this.$context || (this.$context = createContext(null, {
        chart: this,
        type: "chart"
      }));
    }
    getVisibleDatasetCount() {
      return this.getSortedVisibleDatasetMetas().length;
    }
    isDatasetVisible(datasetIndex) {
      const dataset = this.data.datasets[datasetIndex];
      if (!dataset) {
        return false;
      }
      const meta = this.getDatasetMeta(datasetIndex);
      return typeof meta.hidden === "boolean" ? !meta.hidden : !dataset.hidden;
    }
    setDatasetVisibility(datasetIndex, visible) {
      const meta = this.getDatasetMeta(datasetIndex);
      meta.hidden = !visible;
    }
    toggleDataVisibility(index2) {
      this._hiddenIndices[index2] = !this._hiddenIndices[index2];
    }
    getDataVisibility(index2) {
      return !this._hiddenIndices[index2];
    }
    _updateVisibility(datasetIndex, dataIndex, visible) {
      const mode = visible ? "show" : "hide";
      const meta = this.getDatasetMeta(datasetIndex);
      const anims = meta.controller._resolveAnimations(void 0, mode);
      if (defined(dataIndex)) {
        meta.data[dataIndex].hidden = !visible;
        this.update();
      } else {
        this.setDatasetVisibility(datasetIndex, visible);
        anims.update(meta, {
          visible
        });
        this.update((ctx) => ctx.datasetIndex === datasetIndex ? mode : void 0);
      }
    }
    hide(datasetIndex, dataIndex) {
      this._updateVisibility(datasetIndex, dataIndex, false);
    }
    show(datasetIndex, dataIndex) {
      this._updateVisibility(datasetIndex, dataIndex, true);
    }
    _destroyDatasetMeta(datasetIndex) {
      const meta = this._metasets[datasetIndex];
      if (meta && meta.controller) {
        meta.controller._destroy();
      }
      delete this._metasets[datasetIndex];
    }
    _stop() {
      let i, ilen;
      this.stop();
      animator.remove(this);
      for (i = 0, ilen = this.data.datasets.length; i < ilen; ++i) {
        this._destroyDatasetMeta(i);
      }
    }
    destroy() {
      this.notifyPlugins("beforeDestroy");
      const { canvas, ctx } = this;
      this._stop();
      this.config.clearCache();
      if (canvas) {
        this.unbindEvents();
        clearCanvas(canvas, ctx);
        this.platform.releaseContext(ctx);
        this.canvas = null;
        this.ctx = null;
      }
      delete instances[this.id];
      this.notifyPlugins("afterDestroy");
    }
    toBase64Image(...args) {
      return this.canvas.toDataURL(...args);
    }
    bindEvents() {
      this.bindUserEvents();
      if (this.options.responsive) {
        this.bindResponsiveEvents();
      } else {
        this.attached = true;
      }
    }
    bindUserEvents() {
      const listeners = this._listeners;
      const platform = this.platform;
      const _add = (type2, listener2) => {
        platform.addEventListener(this, type2, listener2);
        listeners[type2] = listener2;
      };
      const listener = (e, x, y) => {
        e.offsetX = x;
        e.offsetY = y;
        this._eventHandler(e);
      };
      each(this.options.events, (type2) => _add(type2, listener));
    }
    bindResponsiveEvents() {
      if (!this._responsiveListeners) {
        this._responsiveListeners = {};
      }
      const listeners = this._responsiveListeners;
      const platform = this.platform;
      const _add = (type2, listener2) => {
        platform.addEventListener(this, type2, listener2);
        listeners[type2] = listener2;
      };
      const _remove = (type2, listener2) => {
        if (listeners[type2]) {
          platform.removeEventListener(this, type2, listener2);
          delete listeners[type2];
        }
      };
      const listener = (width, height) => {
        if (this.canvas) {
          this.resize(width, height);
        }
      };
      let detached;
      const attached = () => {
        _remove("attach", attached);
        this.attached = true;
        this.resize();
        _add("resize", listener);
        _add("detach", detached);
      };
      detached = () => {
        this.attached = false;
        _remove("resize", listener);
        this._stop();
        this._resize(0, 0);
        _add("attach", attached);
      };
      if (platform.isAttached(this.canvas)) {
        attached();
      } else {
        detached();
      }
    }
    unbindEvents() {
      each(this._listeners, (listener, type2) => {
        this.platform.removeEventListener(this, type2, listener);
      });
      this._listeners = {};
      each(this._responsiveListeners, (listener, type2) => {
        this.platform.removeEventListener(this, type2, listener);
      });
      this._responsiveListeners = void 0;
    }
    updateHoverStyle(items, mode, enabled) {
      const prefix = enabled ? "set" : "remove";
      let meta, item, i, ilen;
      if (mode === "dataset") {
        meta = this.getDatasetMeta(items[0].datasetIndex);
        meta.controller["_" + prefix + "DatasetHoverStyle"]();
      }
      for (i = 0, ilen = items.length; i < ilen; ++i) {
        item = items[i];
        const controller = item && this.getDatasetMeta(item.datasetIndex).controller;
        if (controller) {
          controller[prefix + "HoverStyle"](item.element, item.datasetIndex, item.index);
        }
      }
    }
    getActiveElements() {
      return this._active || [];
    }
    setActiveElements(activeElements) {
      const lastActive = this._active || [];
      const active = activeElements.map(({ datasetIndex, index: index2 }) => {
        const meta = this.getDatasetMeta(datasetIndex);
        if (!meta) {
          throw new Error("No dataset found at index " + datasetIndex);
        }
        return {
          datasetIndex,
          element: meta.data[index2],
          index: index2
        };
      });
      const changed = !_elementsEqual(active, lastActive);
      if (changed) {
        this._active = active;
        this._lastEvent = null;
        this._updateHoverStyles(active, lastActive);
      }
    }
    notifyPlugins(hook, args, filter2) {
      return this._plugins.notify(this, hook, args, filter2);
    }
    isPluginEnabled(pluginId) {
      return this._plugins._cache.filter((p) => p.plugin.id === pluginId).length === 1;
    }
    _updateHoverStyles(active, lastActive, replay) {
      const hoverOptions = this.options.hover;
      const diff = (a, b) => a.filter((x) => !b.some((y) => x.datasetIndex === y.datasetIndex && x.index === y.index));
      const deactivated = diff(lastActive, active);
      const activated = replay ? active : diff(active, lastActive);
      if (deactivated.length) {
        this.updateHoverStyle(deactivated, hoverOptions.mode, false);
      }
      if (activated.length && hoverOptions.mode) {
        this.updateHoverStyle(activated, hoverOptions.mode, true);
      }
    }
    _eventHandler(e, replay) {
      const args = {
        event: e,
        replay,
        cancelable: true,
        inChartArea: this.isPointInArea(e)
      };
      const eventFilter = (plugin) => (plugin.options.events || this.options.events).includes(e.native.type);
      if (this.notifyPlugins("beforeEvent", args, eventFilter) === false) {
        return;
      }
      const changed = this._handleEvent(e, replay, args.inChartArea);
      args.cancelable = false;
      this.notifyPlugins("afterEvent", args, eventFilter);
      if (changed || args.changed) {
        this.render();
      }
      return this;
    }
    _handleEvent(e, replay, inChartArea) {
      const { _active: lastActive = [], options } = this;
      const useFinalPosition = replay;
      const active = this._getActiveElements(e, lastActive, inChartArea, useFinalPosition);
      const isClick = _isClickEvent(e);
      const lastEvent = determineLastEvent(e, this._lastEvent, inChartArea, isClick);
      if (inChartArea) {
        this._lastEvent = null;
        callback(options.onHover, [
          e,
          active,
          this
        ], this);
        if (isClick) {
          callback(options.onClick, [
            e,
            active,
            this
          ], this);
        }
      }
      const changed = !_elementsEqual(active, lastActive);
      if (changed || replay) {
        this._active = active;
        this._updateHoverStyles(active, lastActive, replay);
      }
      this._lastEvent = lastEvent;
      return changed;
    }
    _getActiveElements(e, lastActive, inChartArea, useFinalPosition) {
      if (e.type === "mouseout") {
        return [];
      }
      if (!inChartArea) {
        return lastActive;
      }
      const hoverOptions = this.options.hover;
      return this.getElementsAtEventForMode(e, hoverOptions.mode, hoverOptions, useFinalPosition);
    }
  };
  __publicField(Chart, "defaults", defaults);
  __publicField(Chart, "instances", instances);
  __publicField(Chart, "overrides", overrides);
  __publicField(Chart, "registry", registry);
  __publicField(Chart, "version", version);
  __publicField(Chart, "getChart", getChart);
  function invalidatePlugins() {
    return each(Chart.instances, (chart) => chart._plugins.invalidate());
  }
  function clipArc(ctx, element, endAngle) {
    const { startAngle, pixelMargin, x, y, outerRadius, innerRadius } = element;
    let angleMargin = pixelMargin / outerRadius;
    ctx.beginPath();
    ctx.arc(x, y, outerRadius, startAngle - angleMargin, endAngle + angleMargin);
    if (innerRadius > pixelMargin) {
      angleMargin = pixelMargin / innerRadius;
      ctx.arc(x, y, innerRadius, endAngle + angleMargin, startAngle - angleMargin, true);
    } else {
      ctx.arc(x, y, pixelMargin, endAngle + HALF_PI, startAngle - HALF_PI);
    }
    ctx.closePath();
    ctx.clip();
  }
  function toRadiusCorners(value) {
    return _readValueToProps(value, [
      "outerStart",
      "outerEnd",
      "innerStart",
      "innerEnd"
    ]);
  }
  function parseBorderRadius$1(arc, innerRadius, outerRadius, angleDelta) {
    const o = toRadiusCorners(arc.options.borderRadius);
    const halfThickness = (outerRadius - innerRadius) / 2;
    const innerLimit = Math.min(halfThickness, angleDelta * innerRadius / 2);
    const computeOuterLimit = (val) => {
      const outerArcLimit = (outerRadius - Math.min(halfThickness, val)) * angleDelta / 2;
      return _limitValue(val, 0, Math.min(halfThickness, outerArcLimit));
    };
    return {
      outerStart: computeOuterLimit(o.outerStart),
      outerEnd: computeOuterLimit(o.outerEnd),
      innerStart: _limitValue(o.innerStart, 0, innerLimit),
      innerEnd: _limitValue(o.innerEnd, 0, innerLimit)
    };
  }
  function rThetaToXY(r, theta, x, y) {
    return {
      x: x + r * Math.cos(theta),
      y: y + r * Math.sin(theta)
    };
  }
  function pathArc(ctx, element, offset, spacing, end, circular) {
    const { x, y, startAngle: start2, pixelMargin, innerRadius: innerR } = element;
    const outerRadius = Math.max(element.outerRadius + spacing + offset - pixelMargin, 0);
    const innerRadius = innerR > 0 ? innerR + spacing + offset + pixelMargin : 0;
    let spacingOffset = 0;
    const alpha2 = end - start2;
    if (spacing) {
      const noSpacingInnerRadius = innerR > 0 ? innerR - spacing : 0;
      const noSpacingOuterRadius = outerRadius > 0 ? outerRadius - spacing : 0;
      const avNogSpacingRadius = (noSpacingInnerRadius + noSpacingOuterRadius) / 2;
      const adjustedAngle = avNogSpacingRadius !== 0 ? alpha2 * avNogSpacingRadius / (avNogSpacingRadius + spacing) : alpha2;
      spacingOffset = (alpha2 - adjustedAngle) / 2;
    }
    const beta = Math.max(1e-3, alpha2 * outerRadius - offset / PI) / outerRadius;
    const angleOffset = (alpha2 - beta) / 2;
    const startAngle = start2 + angleOffset + spacingOffset;
    const endAngle = end - angleOffset - spacingOffset;
    const { outerStart, outerEnd, innerStart, innerEnd } = parseBorderRadius$1(element, innerRadius, outerRadius, endAngle - startAngle);
    const outerStartAdjustedRadius = outerRadius - outerStart;
    const outerEndAdjustedRadius = outerRadius - outerEnd;
    const outerStartAdjustedAngle = startAngle + outerStart / outerStartAdjustedRadius;
    const outerEndAdjustedAngle = endAngle - outerEnd / outerEndAdjustedRadius;
    const innerStartAdjustedRadius = innerRadius + innerStart;
    const innerEndAdjustedRadius = innerRadius + innerEnd;
    const innerStartAdjustedAngle = startAngle + innerStart / innerStartAdjustedRadius;
    const innerEndAdjustedAngle = endAngle - innerEnd / innerEndAdjustedRadius;
    ctx.beginPath();
    if (circular) {
      const outerMidAdjustedAngle = (outerStartAdjustedAngle + outerEndAdjustedAngle) / 2;
      ctx.arc(x, y, outerRadius, outerStartAdjustedAngle, outerMidAdjustedAngle);
      ctx.arc(x, y, outerRadius, outerMidAdjustedAngle, outerEndAdjustedAngle);
      if (outerEnd > 0) {
        const pCenter = rThetaToXY(outerEndAdjustedRadius, outerEndAdjustedAngle, x, y);
        ctx.arc(pCenter.x, pCenter.y, outerEnd, outerEndAdjustedAngle, endAngle + HALF_PI);
      }
      const p4 = rThetaToXY(innerEndAdjustedRadius, endAngle, x, y);
      ctx.lineTo(p4.x, p4.y);
      if (innerEnd > 0) {
        const pCenter1 = rThetaToXY(innerEndAdjustedRadius, innerEndAdjustedAngle, x, y);
        ctx.arc(pCenter1.x, pCenter1.y, innerEnd, endAngle + HALF_PI, innerEndAdjustedAngle + Math.PI);
      }
      const innerMidAdjustedAngle = (endAngle - innerEnd / innerRadius + (startAngle + innerStart / innerRadius)) / 2;
      ctx.arc(x, y, innerRadius, endAngle - innerEnd / innerRadius, innerMidAdjustedAngle, true);
      ctx.arc(x, y, innerRadius, innerMidAdjustedAngle, startAngle + innerStart / innerRadius, true);
      if (innerStart > 0) {
        const pCenter2 = rThetaToXY(innerStartAdjustedRadius, innerStartAdjustedAngle, x, y);
        ctx.arc(pCenter2.x, pCenter2.y, innerStart, innerStartAdjustedAngle + Math.PI, startAngle - HALF_PI);
      }
      const p8 = rThetaToXY(outerStartAdjustedRadius, startAngle, x, y);
      ctx.lineTo(p8.x, p8.y);
      if (outerStart > 0) {
        const pCenter3 = rThetaToXY(outerStartAdjustedRadius, outerStartAdjustedAngle, x, y);
        ctx.arc(pCenter3.x, pCenter3.y, outerStart, startAngle - HALF_PI, outerStartAdjustedAngle);
      }
    } else {
      ctx.moveTo(x, y);
      const outerStartX = Math.cos(outerStartAdjustedAngle) * outerRadius + x;
      const outerStartY = Math.sin(outerStartAdjustedAngle) * outerRadius + y;
      ctx.lineTo(outerStartX, outerStartY);
      const outerEndX = Math.cos(outerEndAdjustedAngle) * outerRadius + x;
      const outerEndY = Math.sin(outerEndAdjustedAngle) * outerRadius + y;
      ctx.lineTo(outerEndX, outerEndY);
    }
    ctx.closePath();
  }
  function drawArc(ctx, element, offset, spacing, circular) {
    const { fullCircles, startAngle, circumference } = element;
    let endAngle = element.endAngle;
    if (fullCircles) {
      pathArc(ctx, element, offset, spacing, endAngle, circular);
      for (let i = 0; i < fullCircles; ++i) {
        ctx.fill();
      }
      if (!isNaN(circumference)) {
        endAngle = startAngle + (circumference % TAU || TAU);
      }
    }
    pathArc(ctx, element, offset, spacing, endAngle, circular);
    ctx.fill();
    return endAngle;
  }
  function drawBorder(ctx, element, offset, spacing, circular) {
    const { fullCircles, startAngle, circumference, options } = element;
    const { borderWidth, borderJoinStyle } = options;
    const inner = options.borderAlign === "inner";
    if (!borderWidth) {
      return;
    }
    if (inner) {
      ctx.lineWidth = borderWidth * 2;
      ctx.lineJoin = borderJoinStyle || "round";
    } else {
      ctx.lineWidth = borderWidth;
      ctx.lineJoin = borderJoinStyle || "bevel";
    }
    let endAngle = element.endAngle;
    if (fullCircles) {
      pathArc(ctx, element, offset, spacing, endAngle, circular);
      for (let i = 0; i < fullCircles; ++i) {
        ctx.stroke();
      }
      if (!isNaN(circumference)) {
        endAngle = startAngle + (circumference % TAU || TAU);
      }
    }
    if (inner) {
      clipArc(ctx, element, endAngle);
    }
    if (!fullCircles) {
      pathArc(ctx, element, offset, spacing, endAngle, circular);
      ctx.stroke();
    }
  }
  var ArcElement = class extends Element {
    constructor(cfg) {
      super();
      this.options = void 0;
      this.circumference = void 0;
      this.startAngle = void 0;
      this.endAngle = void 0;
      this.innerRadius = void 0;
      this.outerRadius = void 0;
      this.pixelMargin = 0;
      this.fullCircles = 0;
      if (cfg) {
        Object.assign(this, cfg);
      }
    }
    inRange(chartX, chartY, useFinalPosition) {
      const point = this.getProps([
        "x",
        "y"
      ], useFinalPosition);
      const { angle, distance } = getAngleFromPoint(point, {
        x: chartX,
        y: chartY
      });
      const { startAngle, endAngle, innerRadius, outerRadius, circumference } = this.getProps([
        "startAngle",
        "endAngle",
        "innerRadius",
        "outerRadius",
        "circumference"
      ], useFinalPosition);
      const rAdjust = this.options.spacing / 2;
      const _circumference = valueOrDefault(circumference, endAngle - startAngle);
      const betweenAngles = _circumference >= TAU || _angleBetween(angle, startAngle, endAngle);
      const withinRadius = _isBetween(distance, innerRadius + rAdjust, outerRadius + rAdjust);
      return betweenAngles && withinRadius;
    }
    getCenterPoint(useFinalPosition) {
      const { x, y, startAngle, endAngle, innerRadius, outerRadius } = this.getProps([
        "x",
        "y",
        "startAngle",
        "endAngle",
        "innerRadius",
        "outerRadius"
      ], useFinalPosition);
      const { offset, spacing } = this.options;
      const halfAngle = (startAngle + endAngle) / 2;
      const halfRadius = (innerRadius + outerRadius + spacing + offset) / 2;
      return {
        x: x + Math.cos(halfAngle) * halfRadius,
        y: y + Math.sin(halfAngle) * halfRadius
      };
    }
    tooltipPosition(useFinalPosition) {
      return this.getCenterPoint(useFinalPosition);
    }
    draw(ctx) {
      const { options, circumference } = this;
      const offset = (options.offset || 0) / 4;
      const spacing = (options.spacing || 0) / 2;
      const circular = options.circular;
      this.pixelMargin = options.borderAlign === "inner" ? 0.33 : 0;
      this.fullCircles = circumference > TAU ? Math.floor(circumference / TAU) : 0;
      if (circumference === 0 || this.innerRadius < 0 || this.outerRadius < 0) {
        return;
      }
      ctx.save();
      const halfAngle = (this.startAngle + this.endAngle) / 2;
      ctx.translate(Math.cos(halfAngle) * offset, Math.sin(halfAngle) * offset);
      const fix = 1 - Math.sin(Math.min(PI, circumference || 0));
      const radiusOffset = offset * fix;
      ctx.fillStyle = options.backgroundColor;
      ctx.strokeStyle = options.borderColor;
      drawArc(ctx, this, radiusOffset, spacing, circular);
      drawBorder(ctx, this, radiusOffset, spacing, circular);
      ctx.restore();
    }
  };
  __publicField(ArcElement, "id", "arc");
  __publicField(ArcElement, "defaults", {
    borderAlign: "center",
    borderColor: "#fff",
    borderJoinStyle: void 0,
    borderRadius: 0,
    borderWidth: 2,
    offset: 0,
    spacing: 0,
    angle: void 0,
    circular: true
  });
  __publicField(ArcElement, "defaultRoutes", {
    backgroundColor: "backgroundColor"
  });
  function setStyle(ctx, options, style = options) {
    ctx.lineCap = valueOrDefault(style.borderCapStyle, options.borderCapStyle);
    ctx.setLineDash(valueOrDefault(style.borderDash, options.borderDash));
    ctx.lineDashOffset = valueOrDefault(style.borderDashOffset, options.borderDashOffset);
    ctx.lineJoin = valueOrDefault(style.borderJoinStyle, options.borderJoinStyle);
    ctx.lineWidth = valueOrDefault(style.borderWidth, options.borderWidth);
    ctx.strokeStyle = valueOrDefault(style.borderColor, options.borderColor);
  }
  function lineTo(ctx, previous, target) {
    ctx.lineTo(target.x, target.y);
  }
  function getLineMethod(options) {
    if (options.stepped) {
      return _steppedLineTo;
    }
    if (options.tension || options.cubicInterpolationMode === "monotone") {
      return _bezierCurveTo;
    }
    return lineTo;
  }
  function pathVars(points, segment, params = {}) {
    const count = points.length;
    const { start: paramsStart = 0, end: paramsEnd = count - 1 } = params;
    const { start: segmentStart, end: segmentEnd } = segment;
    const start2 = Math.max(paramsStart, segmentStart);
    const end = Math.min(paramsEnd, segmentEnd);
    const outside = paramsStart < segmentStart && paramsEnd < segmentStart || paramsStart > segmentEnd && paramsEnd > segmentEnd;
    return {
      count,
      start: start2,
      loop: segment.loop,
      ilen: end < start2 && !outside ? count + end - start2 : end - start2
    };
  }
  function pathSegment(ctx, line, segment, params) {
    const { points, options } = line;
    const { count, start: start2, loop, ilen } = pathVars(points, segment, params);
    const lineMethod = getLineMethod(options);
    let { move = true, reverse } = params || {};
    let i, point, prev;
    for (i = 0; i <= ilen; ++i) {
      point = points[(start2 + (reverse ? ilen - i : i)) % count];
      if (point.skip) {
        continue;
      } else if (move) {
        ctx.moveTo(point.x, point.y);
        move = false;
      } else {
        lineMethod(ctx, prev, point, reverse, options.stepped);
      }
      prev = point;
    }
    if (loop) {
      point = points[(start2 + (reverse ? ilen : 0)) % count];
      lineMethod(ctx, prev, point, reverse, options.stepped);
    }
    return !!loop;
  }
  function fastPathSegment(ctx, line, segment, params) {
    const points = line.points;
    const { count, start: start2, ilen } = pathVars(points, segment, params);
    const { move = true, reverse } = params || {};
    let avgX = 0;
    let countX = 0;
    let i, point, prevX, minY, maxY, lastY;
    const pointIndex = (index2) => (start2 + (reverse ? ilen - index2 : index2)) % count;
    const drawX = () => {
      if (minY !== maxY) {
        ctx.lineTo(avgX, maxY);
        ctx.lineTo(avgX, minY);
        ctx.lineTo(avgX, lastY);
      }
    };
    if (move) {
      point = points[pointIndex(0)];
      ctx.moveTo(point.x, point.y);
    }
    for (i = 0; i <= ilen; ++i) {
      point = points[pointIndex(i)];
      if (point.skip) {
        continue;
      }
      const x = point.x;
      const y = point.y;
      const truncX = x | 0;
      if (truncX === prevX) {
        if (y < minY) {
          minY = y;
        } else if (y > maxY) {
          maxY = y;
        }
        avgX = (countX * avgX + x) / ++countX;
      } else {
        drawX();
        ctx.lineTo(x, y);
        prevX = truncX;
        countX = 0;
        minY = maxY = y;
      }
      lastY = y;
    }
    drawX();
  }
  function _getSegmentMethod(line) {
    const opts = line.options;
    const borderDash = opts.borderDash && opts.borderDash.length;
    const useFastPath = !line._decimated && !line._loop && !opts.tension && opts.cubicInterpolationMode !== "monotone" && !opts.stepped && !borderDash;
    return useFastPath ? fastPathSegment : pathSegment;
  }
  function _getInterpolationMethod(options) {
    if (options.stepped) {
      return _steppedInterpolation;
    }
    if (options.tension || options.cubicInterpolationMode === "monotone") {
      return _bezierInterpolation;
    }
    return _pointInLine;
  }
  function strokePathWithCache(ctx, line, start2, count) {
    let path = line._path;
    if (!path) {
      path = line._path = new Path2D();
      if (line.path(path, start2, count)) {
        path.closePath();
      }
    }
    setStyle(ctx, line.options);
    ctx.stroke(path);
  }
  function strokePathDirect(ctx, line, start2, count) {
    const { segments, options } = line;
    const segmentMethod = _getSegmentMethod(line);
    for (const segment of segments) {
      setStyle(ctx, options, segment.style);
      ctx.beginPath();
      if (segmentMethod(ctx, line, segment, {
        start: start2,
        end: start2 + count - 1
      })) {
        ctx.closePath();
      }
      ctx.stroke();
    }
  }
  var usePath2D = typeof Path2D === "function";
  function draw(ctx, line, start2, count) {
    if (usePath2D && !line.options.segment) {
      strokePathWithCache(ctx, line, start2, count);
    } else {
      strokePathDirect(ctx, line, start2, count);
    }
  }
  var LineElement = class extends Element {
    constructor(cfg) {
      super();
      this.animated = true;
      this.options = void 0;
      this._chart = void 0;
      this._loop = void 0;
      this._fullLoop = void 0;
      this._path = void 0;
      this._points = void 0;
      this._segments = void 0;
      this._decimated = false;
      this._pointsUpdated = false;
      this._datasetIndex = void 0;
      if (cfg) {
        Object.assign(this, cfg);
      }
    }
    updateControlPoints(chartArea, indexAxis) {
      const options = this.options;
      if ((options.tension || options.cubicInterpolationMode === "monotone") && !options.stepped && !this._pointsUpdated) {
        const loop = options.spanGaps ? this._loop : this._fullLoop;
        _updateBezierControlPoints(this._points, options, chartArea, loop, indexAxis);
        this._pointsUpdated = true;
      }
    }
    set points(points) {
      this._points = points;
      delete this._segments;
      delete this._path;
      this._pointsUpdated = false;
    }
    get points() {
      return this._points;
    }
    get segments() {
      return this._segments || (this._segments = _computeSegments(this, this.options.segment));
    }
    first() {
      const segments = this.segments;
      const points = this.points;
      return segments.length && points[segments[0].start];
    }
    last() {
      const segments = this.segments;
      const points = this.points;
      const count = segments.length;
      return count && points[segments[count - 1].end];
    }
    interpolate(point, property) {
      const options = this.options;
      const value = point[property];
      const points = this.points;
      const segments = _boundSegments(this, {
        property,
        start: value,
        end: value
      });
      if (!segments.length) {
        return;
      }
      const result = [];
      const _interpolate = _getInterpolationMethod(options);
      let i, ilen;
      for (i = 0, ilen = segments.length; i < ilen; ++i) {
        const { start: start2, end } = segments[i];
        const p1 = points[start2];
        const p2 = points[end];
        if (p1 === p2) {
          result.push(p1);
          continue;
        }
        const t = Math.abs((value - p1[property]) / (p2[property] - p1[property]));
        const interpolated = _interpolate(p1, p2, t, options.stepped);
        interpolated[property] = point[property];
        result.push(interpolated);
      }
      return result.length === 1 ? result[0] : result;
    }
    pathSegment(ctx, segment, params) {
      const segmentMethod = _getSegmentMethod(this);
      return segmentMethod(ctx, this, segment, params);
    }
    path(ctx, start2, count) {
      const segments = this.segments;
      const segmentMethod = _getSegmentMethod(this);
      let loop = this._loop;
      start2 = start2 || 0;
      count = count || this.points.length - start2;
      for (const segment of segments) {
        loop &= segmentMethod(ctx, this, segment, {
          start: start2,
          end: start2 + count - 1
        });
      }
      return !!loop;
    }
    draw(ctx, chartArea, start2, count) {
      const options = this.options || {};
      const points = this.points || [];
      if (points.length && options.borderWidth) {
        ctx.save();
        draw(ctx, this, start2, count);
        ctx.restore();
      }
      if (this.animated) {
        this._pointsUpdated = false;
        this._path = void 0;
      }
    }
  };
  __publicField(LineElement, "id", "line");
  __publicField(LineElement, "defaults", {
    borderCapStyle: "butt",
    borderDash: [],
    borderDashOffset: 0,
    borderJoinStyle: "miter",
    borderWidth: 3,
    capBezierPoints: true,
    cubicInterpolationMode: "default",
    fill: false,
    spanGaps: false,
    stepped: false,
    tension: 0
  });
  __publicField(LineElement, "defaultRoutes", {
    backgroundColor: "backgroundColor",
    borderColor: "borderColor"
  });
  __publicField(LineElement, "descriptors", {
    _scriptable: true,
    _indexable: (name2) => name2 !== "borderDash" && name2 !== "fill"
  });
  function inRange$1(el, pos, axis, useFinalPosition) {
    const options = el.options;
    const { [axis]: value } = el.getProps([
      axis
    ], useFinalPosition);
    return Math.abs(pos - value) < options.radius + options.hitRadius;
  }
  var PointElement = class extends Element {
    constructor(cfg) {
      super();
      this.options = void 0;
      this.parsed = void 0;
      this.skip = void 0;
      this.stop = void 0;
      if (cfg) {
        Object.assign(this, cfg);
      }
    }
    inRange(mouseX, mouseY, useFinalPosition) {
      const options = this.options;
      const { x, y } = this.getProps([
        "x",
        "y"
      ], useFinalPosition);
      return Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2) < Math.pow(options.hitRadius + options.radius, 2);
    }
    inXRange(mouseX, useFinalPosition) {
      return inRange$1(this, mouseX, "x", useFinalPosition);
    }
    inYRange(mouseY, useFinalPosition) {
      return inRange$1(this, mouseY, "y", useFinalPosition);
    }
    getCenterPoint(useFinalPosition) {
      const { x, y } = this.getProps([
        "x",
        "y"
      ], useFinalPosition);
      return {
        x,
        y
      };
    }
    size(options) {
      options = options || this.options || {};
      let radius = options.radius || 0;
      radius = Math.max(radius, radius && options.hoverRadius || 0);
      const borderWidth = radius && options.borderWidth || 0;
      return (radius + borderWidth) * 2;
    }
    draw(ctx, area) {
      const options = this.options;
      if (this.skip || options.radius < 0.1 || !_isPointInArea(this, area, this.size(options) / 2)) {
        return;
      }
      ctx.strokeStyle = options.borderColor;
      ctx.lineWidth = options.borderWidth;
      ctx.fillStyle = options.backgroundColor;
      drawPoint(ctx, options, this.x, this.y);
    }
    getRange() {
      const options = this.options || {};
      return options.radius + options.hitRadius;
    }
  };
  __publicField(PointElement, "id", "point");
  /**
  * @type {any}
  */
  __publicField(PointElement, "defaults", {
    borderWidth: 1,
    hitRadius: 1,
    hoverBorderWidth: 1,
    hoverRadius: 4,
    pointStyle: "circle",
    radius: 3,
    rotation: 0
  });
  /**
  * @type {any}
  */
  __publicField(PointElement, "defaultRoutes", {
    backgroundColor: "backgroundColor",
    borderColor: "borderColor"
  });
  function getBarBounds(bar, useFinalPosition) {
    const { x, y, base, width, height } = bar.getProps([
      "x",
      "y",
      "base",
      "width",
      "height"
    ], useFinalPosition);
    let left, right, top, bottom, half;
    if (bar.horizontal) {
      half = height / 2;
      left = Math.min(x, base);
      right = Math.max(x, base);
      top = y - half;
      bottom = y + half;
    } else {
      half = width / 2;
      left = x - half;
      right = x + half;
      top = Math.min(y, base);
      bottom = Math.max(y, base);
    }
    return {
      left,
      top,
      right,
      bottom
    };
  }
  function skipOrLimit(skip2, value, min2, max2) {
    return skip2 ? 0 : _limitValue(value, min2, max2);
  }
  function parseBorderWidth(bar, maxW, maxH) {
    const value = bar.options.borderWidth;
    const skip2 = bar.borderSkipped;
    const o = toTRBL(value);
    return {
      t: skipOrLimit(skip2.top, o.top, 0, maxH),
      r: skipOrLimit(skip2.right, o.right, 0, maxW),
      b: skipOrLimit(skip2.bottom, o.bottom, 0, maxH),
      l: skipOrLimit(skip2.left, o.left, 0, maxW)
    };
  }
  function parseBorderRadius(bar, maxW, maxH) {
    const { enableBorderRadius } = bar.getProps([
      "enableBorderRadius"
    ]);
    const value = bar.options.borderRadius;
    const o = toTRBLCorners(value);
    const maxR = Math.min(maxW, maxH);
    const skip2 = bar.borderSkipped;
    const enableBorder = enableBorderRadius || isObject(value);
    return {
      topLeft: skipOrLimit(!enableBorder || skip2.top || skip2.left, o.topLeft, 0, maxR),
      topRight: skipOrLimit(!enableBorder || skip2.top || skip2.right, o.topRight, 0, maxR),
      bottomLeft: skipOrLimit(!enableBorder || skip2.bottom || skip2.left, o.bottomLeft, 0, maxR),
      bottomRight: skipOrLimit(!enableBorder || skip2.bottom || skip2.right, o.bottomRight, 0, maxR)
    };
  }
  function boundingRects(bar) {
    const bounds = getBarBounds(bar);
    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;
    const border = parseBorderWidth(bar, width / 2, height / 2);
    const radius = parseBorderRadius(bar, width / 2, height / 2);
    return {
      outer: {
        x: bounds.left,
        y: bounds.top,
        w: width,
        h: height,
        radius
      },
      inner: {
        x: bounds.left + border.l,
        y: bounds.top + border.t,
        w: width - border.l - border.r,
        h: height - border.t - border.b,
        radius: {
          topLeft: Math.max(0, radius.topLeft - Math.max(border.t, border.l)),
          topRight: Math.max(0, radius.topRight - Math.max(border.t, border.r)),
          bottomLeft: Math.max(0, radius.bottomLeft - Math.max(border.b, border.l)),
          bottomRight: Math.max(0, radius.bottomRight - Math.max(border.b, border.r))
        }
      }
    };
  }
  function inRange(bar, x, y, useFinalPosition) {
    const skipX = x === null;
    const skipY = y === null;
    const skipBoth = skipX && skipY;
    const bounds = bar && !skipBoth && getBarBounds(bar, useFinalPosition);
    return bounds && (skipX || _isBetween(x, bounds.left, bounds.right)) && (skipY || _isBetween(y, bounds.top, bounds.bottom));
  }
  function hasRadius(radius) {
    return radius.topLeft || radius.topRight || radius.bottomLeft || radius.bottomRight;
  }
  function addNormalRectPath(ctx, rect) {
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
  }
  function inflateRect(rect, amount, refRect = {}) {
    const x = rect.x !== refRect.x ? -amount : 0;
    const y = rect.y !== refRect.y ? -amount : 0;
    const w = (rect.x + rect.w !== refRect.x + refRect.w ? amount : 0) - x;
    const h = (rect.y + rect.h !== refRect.y + refRect.h ? amount : 0) - y;
    return {
      x: rect.x + x,
      y: rect.y + y,
      w: rect.w + w,
      h: rect.h + h,
      radius: rect.radius
    };
  }
  var BarElement = class extends Element {
    constructor(cfg) {
      super();
      this.options = void 0;
      this.horizontal = void 0;
      this.base = void 0;
      this.width = void 0;
      this.height = void 0;
      this.inflateAmount = void 0;
      if (cfg) {
        Object.assign(this, cfg);
      }
    }
    draw(ctx) {
      const { inflateAmount, options: { borderColor, backgroundColor } } = this;
      const { inner, outer } = boundingRects(this);
      const addRectPath = hasRadius(outer.radius) ? addRoundedRectPath : addNormalRectPath;
      ctx.save();
      if (outer.w !== inner.w || outer.h !== inner.h) {
        ctx.beginPath();
        addRectPath(ctx, inflateRect(outer, inflateAmount, inner));
        ctx.clip();
        addRectPath(ctx, inflateRect(inner, -inflateAmount, outer));
        ctx.fillStyle = borderColor;
        ctx.fill("evenodd");
      }
      ctx.beginPath();
      addRectPath(ctx, inflateRect(inner, inflateAmount));
      ctx.fillStyle = backgroundColor;
      ctx.fill();
      ctx.restore();
    }
    inRange(mouseX, mouseY, useFinalPosition) {
      return inRange(this, mouseX, mouseY, useFinalPosition);
    }
    inXRange(mouseX, useFinalPosition) {
      return inRange(this, mouseX, null, useFinalPosition);
    }
    inYRange(mouseY, useFinalPosition) {
      return inRange(this, null, mouseY, useFinalPosition);
    }
    getCenterPoint(useFinalPosition) {
      const { x, y, base, horizontal } = this.getProps([
        "x",
        "y",
        "base",
        "horizontal"
      ], useFinalPosition);
      return {
        x: horizontal ? (x + base) / 2 : x,
        y: horizontal ? y : (y + base) / 2
      };
    }
    getRange(axis) {
      return axis === "x" ? this.width / 2 : this.height / 2;
    }
  };
  __publicField(BarElement, "id", "bar");
  __publicField(BarElement, "defaults", {
    borderSkipped: "start",
    borderWidth: 0,
    borderRadius: 0,
    inflateAmount: "auto",
    pointStyle: void 0
  });
  __publicField(BarElement, "defaultRoutes", {
    backgroundColor: "backgroundColor",
    borderColor: "borderColor"
  });
  var elements = /* @__PURE__ */ Object.freeze({
    __proto__: null,
    ArcElement,
    LineElement,
    PointElement,
    BarElement
  });
  var BORDER_COLORS = [
    "rgb(54, 162, 235)",
    "rgb(255, 99, 132)",
    "rgb(255, 159, 64)",
    "rgb(255, 205, 86)",
    "rgb(75, 192, 192)",
    "rgb(153, 102, 255)",
    "rgb(201, 203, 207)"
    // grey
  ];
  var BACKGROUND_COLORS = /* @__PURE__ */ BORDER_COLORS.map((color3) => color3.replace("rgb(", "rgba(").replace(")", ", 0.5)"));
  function getBorderColor(i) {
    return BORDER_COLORS[i % BORDER_COLORS.length];
  }
  function getBackgroundColor(i) {
    return BACKGROUND_COLORS[i % BACKGROUND_COLORS.length];
  }
  function colorizeDefaultDataset(dataset, i) {
    dataset.borderColor = getBorderColor(i);
    dataset.backgroundColor = getBackgroundColor(i);
    return ++i;
  }
  function colorizeDoughnutDataset(dataset, i) {
    dataset.backgroundColor = dataset.data.map(() => getBorderColor(i++));
    return i;
  }
  function colorizePolarAreaDataset(dataset, i) {
    dataset.backgroundColor = dataset.data.map(() => getBackgroundColor(i++));
    return i;
  }
  function getColorizer(chart) {
    let i = 0;
    return (dataset, datasetIndex) => {
      const controller = chart.getDatasetMeta(datasetIndex).controller;
      if (controller instanceof DoughnutController) {
        i = colorizeDoughnutDataset(dataset, i);
      } else if (controller instanceof PolarAreaController) {
        i = colorizePolarAreaDataset(dataset, i);
      } else if (controller) {
        i = colorizeDefaultDataset(dataset, i);
      }
    };
  }
  function containsColorsDefinitions(descriptors2) {
    let k;
    for (k in descriptors2) {
      if (descriptors2[k].borderColor || descriptors2[k].backgroundColor) {
        return true;
      }
    }
    return false;
  }
  function containsColorsDefinition(descriptor) {
    return descriptor && (descriptor.borderColor || descriptor.backgroundColor);
  }
  var plugin_colors = {
    id: "colors",
    defaults: {
      enabled: true,
      forceOverride: false
    },
    beforeLayout(chart, _args, options) {
      if (!options.enabled) {
        return;
      }
      const { data: { datasets }, options: chartOptions } = chart.config;
      const { elements: elements2 } = chartOptions;
      if (!options.forceOverride && (containsColorsDefinitions(datasets) || containsColorsDefinition(chartOptions) || elements2 && containsColorsDefinitions(elements2))) {
        return;
      }
      const colorizer = getColorizer(chart);
      datasets.forEach(colorizer);
    }
  };
  function lttbDecimation(data, start2, count, availableWidth, options) {
    const samples = options.samples || availableWidth;
    if (samples >= count) {
      return data.slice(start2, start2 + count);
    }
    const decimated = [];
    const bucketWidth = (count - 2) / (samples - 2);
    let sampledIndex = 0;
    const endIndex = start2 + count - 1;
    let a = start2;
    let i, maxAreaPoint, maxArea, area, nextA;
    decimated[sampledIndex++] = data[a];
    for (i = 0; i < samples - 2; i++) {
      let avgX = 0;
      let avgY = 0;
      let j;
      const avgRangeStart = Math.floor((i + 1) * bucketWidth) + 1 + start2;
      const avgRangeEnd = Math.min(Math.floor((i + 2) * bucketWidth) + 1, count) + start2;
      const avgRangeLength = avgRangeEnd - avgRangeStart;
      for (j = avgRangeStart; j < avgRangeEnd; j++) {
        avgX += data[j].x;
        avgY += data[j].y;
      }
      avgX /= avgRangeLength;
      avgY /= avgRangeLength;
      const rangeOffs = Math.floor(i * bucketWidth) + 1 + start2;
      const rangeTo = Math.min(Math.floor((i + 1) * bucketWidth) + 1, count) + start2;
      const { x: pointAx, y: pointAy } = data[a];
      maxArea = area = -1;
      for (j = rangeOffs; j < rangeTo; j++) {
        area = 0.5 * Math.abs((pointAx - avgX) * (data[j].y - pointAy) - (pointAx - data[j].x) * (avgY - pointAy));
        if (area > maxArea) {
          maxArea = area;
          maxAreaPoint = data[j];
          nextA = j;
        }
      }
      decimated[sampledIndex++] = maxAreaPoint;
      a = nextA;
    }
    decimated[sampledIndex++] = data[endIndex];
    return decimated;
  }
  function minMaxDecimation(data, start2, count, availableWidth) {
    let avgX = 0;
    let countX = 0;
    let i, point, x, y, prevX, minIndex, maxIndex, startIndex, minY, maxY;
    const decimated = [];
    const endIndex = start2 + count - 1;
    const xMin = data[start2].x;
    const xMax = data[endIndex].x;
    const dx = xMax - xMin;
    for (i = start2; i < start2 + count; ++i) {
      point = data[i];
      x = (point.x - xMin) / dx * availableWidth;
      y = point.y;
      const truncX = x | 0;
      if (truncX === prevX) {
        if (y < minY) {
          minY = y;
          minIndex = i;
        } else if (y > maxY) {
          maxY = y;
          maxIndex = i;
        }
        avgX = (countX * avgX + point.x) / ++countX;
      } else {
        const lastIndex = i - 1;
        if (!isNullOrUndef(minIndex) && !isNullOrUndef(maxIndex)) {
          const intermediateIndex1 = Math.min(minIndex, maxIndex);
          const intermediateIndex2 = Math.max(minIndex, maxIndex);
          if (intermediateIndex1 !== startIndex && intermediateIndex1 !== lastIndex) {
            decimated.push({
              ...data[intermediateIndex1],
              x: avgX
            });
          }
          if (intermediateIndex2 !== startIndex && intermediateIndex2 !== lastIndex) {
            decimated.push({
              ...data[intermediateIndex2],
              x: avgX
            });
          }
        }
        if (i > 0 && lastIndex !== startIndex) {
          decimated.push(data[lastIndex]);
        }
        decimated.push(point);
        prevX = truncX;
        countX = 0;
        minY = maxY = y;
        minIndex = maxIndex = startIndex = i;
      }
    }
    return decimated;
  }
  function cleanDecimatedDataset(dataset) {
    if (dataset._decimated) {
      const data = dataset._data;
      delete dataset._decimated;
      delete dataset._data;
      Object.defineProperty(dataset, "data", {
        configurable: true,
        enumerable: true,
        writable: true,
        value: data
      });
    }
  }
  function cleanDecimatedData(chart) {
    chart.data.datasets.forEach((dataset) => {
      cleanDecimatedDataset(dataset);
    });
  }
  function getStartAndCountOfVisiblePointsSimplified(meta, points) {
    const pointCount = points.length;
    let start2 = 0;
    let count;
    const { iScale } = meta;
    const { min: min2, max: max2, minDefined, maxDefined } = iScale.getUserBounds();
    if (minDefined) {
      start2 = _limitValue(_lookupByKey(points, iScale.axis, min2).lo, 0, pointCount - 1);
    }
    if (maxDefined) {
      count = _limitValue(_lookupByKey(points, iScale.axis, max2).hi + 1, start2, pointCount) - start2;
    } else {
      count = pointCount - start2;
    }
    return {
      start: start2,
      count
    };
  }
  var plugin_decimation = {
    id: "decimation",
    defaults: {
      algorithm: "min-max",
      enabled: false
    },
    beforeElementsUpdate: (chart, args, options) => {
      if (!options.enabled) {
        cleanDecimatedData(chart);
        return;
      }
      const availableWidth = chart.width;
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const { _data, indexAxis } = dataset;
        const meta = chart.getDatasetMeta(datasetIndex);
        const data = _data || dataset.data;
        if (resolve([
          indexAxis,
          chart.options.indexAxis
        ]) === "y") {
          return;
        }
        if (!meta.controller.supportsDecimation) {
          return;
        }
        const xAxis = chart.scales[meta.xAxisID];
        if (xAxis.type !== "linear" && xAxis.type !== "time") {
          return;
        }
        if (chart.options.parsing) {
          return;
        }
        let { start: start2, count } = getStartAndCountOfVisiblePointsSimplified(meta, data);
        const threshold = options.threshold || 4 * availableWidth;
        if (count <= threshold) {
          cleanDecimatedDataset(dataset);
          return;
        }
        if (isNullOrUndef(_data)) {
          dataset._data = data;
          delete dataset.data;
          Object.defineProperty(dataset, "data", {
            configurable: true,
            enumerable: true,
            get: function() {
              return this._decimated;
            },
            set: function(d) {
              this._data = d;
            }
          });
        }
        let decimated;
        switch (options.algorithm) {
          case "lttb":
            decimated = lttbDecimation(data, start2, count, availableWidth, options);
            break;
          case "min-max":
            decimated = minMaxDecimation(data, start2, count, availableWidth);
            break;
          default:
            throw new Error(`Unsupported decimation algorithm '${options.algorithm}'`);
        }
        dataset._decimated = decimated;
      });
    },
    destroy(chart) {
      cleanDecimatedData(chart);
    }
  };
  function _segments(line, target, property) {
    const segments = line.segments;
    const points = line.points;
    const tpoints = target.points;
    const parts = [];
    for (const segment of segments) {
      let { start: start2, end } = segment;
      end = _findSegmentEnd(start2, end, points);
      const bounds = _getBounds(property, points[start2], points[end], segment.loop);
      if (!target.segments) {
        parts.push({
          source: segment,
          target: bounds,
          start: points[start2],
          end: points[end]
        });
        continue;
      }
      const targetSegments = _boundSegments(target, bounds);
      for (const tgt of targetSegments) {
        const subBounds = _getBounds(property, tpoints[tgt.start], tpoints[tgt.end], tgt.loop);
        const fillSources = _boundSegment(segment, points, subBounds);
        for (const fillSource of fillSources) {
          parts.push({
            source: fillSource,
            target: tgt,
            start: {
              [property]: _getEdge(bounds, subBounds, "start", Math.max)
            },
            end: {
              [property]: _getEdge(bounds, subBounds, "end", Math.min)
            }
          });
        }
      }
    }
    return parts;
  }
  function _getBounds(property, first, last, loop) {
    if (loop) {
      return;
    }
    let start2 = first[property];
    let end = last[property];
    if (property === "angle") {
      start2 = _normalizeAngle(start2);
      end = _normalizeAngle(end);
    }
    return {
      property,
      start: start2,
      end
    };
  }
  function _pointsFromSegments(boundary, line) {
    const { x = null, y = null } = boundary || {};
    const linePoints = line.points;
    const points = [];
    line.segments.forEach(({ start: start2, end }) => {
      end = _findSegmentEnd(start2, end, linePoints);
      const first = linePoints[start2];
      const last = linePoints[end];
      if (y !== null) {
        points.push({
          x: first.x,
          y
        });
        points.push({
          x: last.x,
          y
        });
      } else if (x !== null) {
        points.push({
          x,
          y: first.y
        });
        points.push({
          x,
          y: last.y
        });
      }
    });
    return points;
  }
  function _findSegmentEnd(start2, end, points) {
    for (; end > start2; end--) {
      const point = points[end];
      if (!isNaN(point.x) && !isNaN(point.y)) {
        break;
      }
    }
    return end;
  }
  function _getEdge(a, b, prop, fn) {
    if (a && b) {
      return fn(a[prop], b[prop]);
    }
    return a ? a[prop] : b ? b[prop] : 0;
  }
  function _createBoundaryLine(boundary, line) {
    let points = [];
    let _loop = false;
    if (isArray(boundary)) {
      _loop = true;
      points = boundary;
    } else {
      points = _pointsFromSegments(boundary, line);
    }
    return points.length ? new LineElement({
      points,
      options: {
        tension: 0
      },
      _loop,
      _fullLoop: _loop
    }) : null;
  }
  function _shouldApplyFill(source) {
    return source && source.fill !== false;
  }
  function _resolveTarget(sources, index2, propagate) {
    const source = sources[index2];
    let fill2 = source.fill;
    const visited = [
      index2
    ];
    let target;
    if (!propagate) {
      return fill2;
    }
    while (fill2 !== false && visited.indexOf(fill2) === -1) {
      if (!isNumberFinite(fill2)) {
        return fill2;
      }
      target = sources[fill2];
      if (!target) {
        return false;
      }
      if (target.visible) {
        return fill2;
      }
      visited.push(fill2);
      fill2 = target.fill;
    }
    return false;
  }
  function _decodeFill(line, index2, count) {
    const fill2 = parseFillOption(line);
    if (isObject(fill2)) {
      return isNaN(fill2.value) ? false : fill2;
    }
    let target = parseFloat(fill2);
    if (isNumberFinite(target) && Math.floor(target) === target) {
      return decodeTargetIndex(fill2[0], index2, target, count);
    }
    return [
      "origin",
      "start",
      "end",
      "stack",
      "shape"
    ].indexOf(fill2) >= 0 && fill2;
  }
  function decodeTargetIndex(firstCh, index2, target, count) {
    if (firstCh === "-" || firstCh === "+") {
      target = index2 + target;
    }
    if (target === index2 || target < 0 || target >= count) {
      return false;
    }
    return target;
  }
  function _getTargetPixel(fill2, scale) {
    let pixel = null;
    if (fill2 === "start") {
      pixel = scale.bottom;
    } else if (fill2 === "end") {
      pixel = scale.top;
    } else if (isObject(fill2)) {
      pixel = scale.getPixelForValue(fill2.value);
    } else if (scale.getBasePixel) {
      pixel = scale.getBasePixel();
    }
    return pixel;
  }
  function _getTargetValue(fill2, scale, startValue) {
    let value;
    if (fill2 === "start") {
      value = startValue;
    } else if (fill2 === "end") {
      value = scale.options.reverse ? scale.min : scale.max;
    } else if (isObject(fill2)) {
      value = fill2.value;
    } else {
      value = scale.getBaseValue();
    }
    return value;
  }
  function parseFillOption(line) {
    const options = line.options;
    const fillOption = options.fill;
    let fill2 = valueOrDefault(fillOption && fillOption.target, fillOption);
    if (fill2 === void 0) {
      fill2 = !!options.backgroundColor;
    }
    if (fill2 === false || fill2 === null) {
      return false;
    }
    if (fill2 === true) {
      return "origin";
    }
    return fill2;
  }
  function _buildStackLine(source) {
    const { scale, index: index2, line } = source;
    const points = [];
    const segments = line.segments;
    const sourcePoints = line.points;
    const linesBelow = getLinesBelow(scale, index2);
    linesBelow.push(_createBoundaryLine({
      x: null,
      y: scale.bottom
    }, line));
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      for (let j = segment.start; j <= segment.end; j++) {
        addPointsBelow(points, sourcePoints[j], linesBelow);
      }
    }
    return new LineElement({
      points,
      options: {}
    });
  }
  function getLinesBelow(scale, index2) {
    const below = [];
    const metas = scale.getMatchingVisibleMetas("line");
    for (let i = 0; i < metas.length; i++) {
      const meta = metas[i];
      if (meta.index === index2) {
        break;
      }
      if (!meta.hidden) {
        below.unshift(meta.dataset);
      }
    }
    return below;
  }
  function addPointsBelow(points, sourcePoint, linesBelow) {
    const postponed = [];
    for (let j = 0; j < linesBelow.length; j++) {
      const line = linesBelow[j];
      const { first, last, point } = findPoint(line, sourcePoint, "x");
      if (!point || first && last) {
        continue;
      }
      if (first) {
        postponed.unshift(point);
      } else {
        points.push(point);
        if (!last) {
          break;
        }
      }
    }
    points.push(...postponed);
  }
  function findPoint(line, sourcePoint, property) {
    const point = line.interpolate(sourcePoint, property);
    if (!point) {
      return {};
    }
    const pointValue = point[property];
    const segments = line.segments;
    const linePoints = line.points;
    let first = false;
    let last = false;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const firstValue = linePoints[segment.start][property];
      const lastValue = linePoints[segment.end][property];
      if (_isBetween(pointValue, firstValue, lastValue)) {
        first = pointValue === firstValue;
        last = pointValue === lastValue;
        break;
      }
    }
    return {
      first,
      last,
      point
    };
  }
  var simpleArc = class {
    constructor(opts) {
      this.x = opts.x;
      this.y = opts.y;
      this.radius = opts.radius;
    }
    pathSegment(ctx, bounds, opts) {
      const { x, y, radius } = this;
      bounds = bounds || {
        start: 0,
        end: TAU
      };
      ctx.arc(x, y, radius, bounds.end, bounds.start, true);
      return !opts.bounds;
    }
    interpolate(point) {
      const { x, y, radius } = this;
      const angle = point.angle;
      return {
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
        angle
      };
    }
  };
  function _getTarget(source) {
    const { chart, fill: fill2, line } = source;
    if (isNumberFinite(fill2)) {
      return getLineByIndex(chart, fill2);
    }
    if (fill2 === "stack") {
      return _buildStackLine(source);
    }
    if (fill2 === "shape") {
      return true;
    }
    const boundary = computeBoundary(source);
    if (boundary instanceof simpleArc) {
      return boundary;
    }
    return _createBoundaryLine(boundary, line);
  }
  function getLineByIndex(chart, index2) {
    const meta = chart.getDatasetMeta(index2);
    const visible = meta && chart.isDatasetVisible(index2);
    return visible ? meta.dataset : null;
  }
  function computeBoundary(source) {
    const scale = source.scale || {};
    if (scale.getPointPositionForValue) {
      return computeCircularBoundary(source);
    }
    return computeLinearBoundary(source);
  }
  function computeLinearBoundary(source) {
    const { scale = {}, fill: fill2 } = source;
    const pixel = _getTargetPixel(fill2, scale);
    if (isNumberFinite(pixel)) {
      const horizontal = scale.isHorizontal();
      return {
        x: horizontal ? pixel : null,
        y: horizontal ? null : pixel
      };
    }
    return null;
  }
  function computeCircularBoundary(source) {
    const { scale, fill: fill2 } = source;
    const options = scale.options;
    const length = scale.getLabels().length;
    const start2 = options.reverse ? scale.max : scale.min;
    const value = _getTargetValue(fill2, scale, start2);
    const target = [];
    if (options.grid.circular) {
      const center = scale.getPointPositionForValue(0, start2);
      return new simpleArc({
        x: center.x,
        y: center.y,
        radius: scale.getDistanceFromCenterForValue(value)
      });
    }
    for (let i = 0; i < length; ++i) {
      target.push(scale.getPointPositionForValue(i, value));
    }
    return target;
  }
  function _drawfill(ctx, source, area) {
    const target = _getTarget(source);
    const { line, scale, axis } = source;
    const lineOpts = line.options;
    const fillOption = lineOpts.fill;
    const color3 = lineOpts.backgroundColor;
    const { above = color3, below = color3 } = fillOption || {};
    if (target && line.points.length) {
      clipArea(ctx, area);
      doFill(ctx, {
        line,
        target,
        above,
        below,
        area,
        scale,
        axis
      });
      unclipArea(ctx);
    }
  }
  function doFill(ctx, cfg) {
    const { line, target, above, below, area, scale } = cfg;
    const property = line._loop ? "angle" : cfg.axis;
    ctx.save();
    if (property === "x" && below !== above) {
      clipVertical(ctx, target, area.top);
      fill(ctx, {
        line,
        target,
        color: above,
        scale,
        property
      });
      ctx.restore();
      ctx.save();
      clipVertical(ctx, target, area.bottom);
    }
    fill(ctx, {
      line,
      target,
      color: below,
      scale,
      property
    });
    ctx.restore();
  }
  function clipVertical(ctx, target, clipY) {
    const { segments, points } = target;
    let first = true;
    let lineLoop = false;
    ctx.beginPath();
    for (const segment of segments) {
      const { start: start2, end } = segment;
      const firstPoint = points[start2];
      const lastPoint = points[_findSegmentEnd(start2, end, points)];
      if (first) {
        ctx.moveTo(firstPoint.x, firstPoint.y);
        first = false;
      } else {
        ctx.lineTo(firstPoint.x, clipY);
        ctx.lineTo(firstPoint.x, firstPoint.y);
      }
      lineLoop = !!target.pathSegment(ctx, segment, {
        move: lineLoop
      });
      if (lineLoop) {
        ctx.closePath();
      } else {
        ctx.lineTo(lastPoint.x, clipY);
      }
    }
    ctx.lineTo(target.first().x, clipY);
    ctx.closePath();
    ctx.clip();
  }
  function fill(ctx, cfg) {
    const { line, target, property, color: color3, scale } = cfg;
    const segments = _segments(line, target, property);
    for (const { source: src, target: tgt, start: start2, end } of segments) {
      const { style: { backgroundColor = color3 } = {} } = src;
      const notShape = target !== true;
      ctx.save();
      ctx.fillStyle = backgroundColor;
      clipBounds(ctx, scale, notShape && _getBounds(property, start2, end));
      ctx.beginPath();
      const lineLoop = !!line.pathSegment(ctx, src);
      let loop;
      if (notShape) {
        if (lineLoop) {
          ctx.closePath();
        } else {
          interpolatedLineTo(ctx, target, end, property);
        }
        const targetLoop = !!target.pathSegment(ctx, tgt, {
          move: lineLoop,
          reverse: true
        });
        loop = lineLoop && targetLoop;
        if (!loop) {
          interpolatedLineTo(ctx, target, start2, property);
        }
      }
      ctx.closePath();
      ctx.fill(loop ? "evenodd" : "nonzero");
      ctx.restore();
    }
  }
  function clipBounds(ctx, scale, bounds) {
    const { top, bottom } = scale.chart.chartArea;
    const { property, start: start2, end } = bounds || {};
    if (property === "x") {
      ctx.beginPath();
      ctx.rect(start2, top, end - start2, bottom - top);
      ctx.clip();
    }
  }
  function interpolatedLineTo(ctx, target, point, property) {
    const interpolatedPoint = target.interpolate(point, property);
    if (interpolatedPoint) {
      ctx.lineTo(interpolatedPoint.x, interpolatedPoint.y);
    }
  }
  var index = {
    id: "filler",
    afterDatasetsUpdate(chart, _args, options) {
      const count = (chart.data.datasets || []).length;
      const sources = [];
      let meta, i, line, source;
      for (i = 0; i < count; ++i) {
        meta = chart.getDatasetMeta(i);
        line = meta.dataset;
        source = null;
        if (line && line.options && line instanceof LineElement) {
          source = {
            visible: chart.isDatasetVisible(i),
            index: i,
            fill: _decodeFill(line, i, count),
            chart,
            axis: meta.controller.options.indexAxis,
            scale: meta.vScale,
            line
          };
        }
        meta.$filler = source;
        sources.push(source);
      }
      for (i = 0; i < count; ++i) {
        source = sources[i];
        if (!source || source.fill === false) {
          continue;
        }
        source.fill = _resolveTarget(sources, i, options.propagate);
      }
    },
    beforeDraw(chart, _args, options) {
      const draw2 = options.drawTime === "beforeDraw";
      const metasets = chart.getSortedVisibleDatasetMetas();
      const area = chart.chartArea;
      for (let i = metasets.length - 1; i >= 0; --i) {
        const source = metasets[i].$filler;
        if (!source) {
          continue;
        }
        source.line.updateControlPoints(area, source.axis);
        if (draw2 && source.fill) {
          _drawfill(chart.ctx, source, area);
        }
      }
    },
    beforeDatasetsDraw(chart, _args, options) {
      if (options.drawTime !== "beforeDatasetsDraw") {
        return;
      }
      const metasets = chart.getSortedVisibleDatasetMetas();
      for (let i = metasets.length - 1; i >= 0; --i) {
        const source = metasets[i].$filler;
        if (_shouldApplyFill(source)) {
          _drawfill(chart.ctx, source, chart.chartArea);
        }
      }
    },
    beforeDatasetDraw(chart, args, options) {
      const source = args.meta.$filler;
      if (!_shouldApplyFill(source) || options.drawTime !== "beforeDatasetDraw") {
        return;
      }
      _drawfill(chart.ctx, source, chart.chartArea);
    },
    defaults: {
      propagate: true,
      drawTime: "beforeDatasetDraw"
    }
  };
  var getBoxSize = (labelOpts, fontSize) => {
    let { boxHeight = fontSize, boxWidth = fontSize } = labelOpts;
    if (labelOpts.usePointStyle) {
      boxHeight = Math.min(boxHeight, fontSize);
      boxWidth = labelOpts.pointStyleWidth || Math.min(boxWidth, fontSize);
    }
    return {
      boxWidth,
      boxHeight,
      itemHeight: Math.max(fontSize, boxHeight)
    };
  };
  var itemsEqual = (a, b) => a !== null && b !== null && a.datasetIndex === b.datasetIndex && a.index === b.index;
  var Legend = class extends Element {
    constructor(config) {
      super();
      this._added = false;
      this.legendHitBoxes = [];
      this._hoveredItem = null;
      this.doughnutMode = false;
      this.chart = config.chart;
      this.options = config.options;
      this.ctx = config.ctx;
      this.legendItems = void 0;
      this.columnSizes = void 0;
      this.lineWidths = void 0;
      this.maxHeight = void 0;
      this.maxWidth = void 0;
      this.top = void 0;
      this.bottom = void 0;
      this.left = void 0;
      this.right = void 0;
      this.height = void 0;
      this.width = void 0;
      this._margins = void 0;
      this.position = void 0;
      this.weight = void 0;
      this.fullSize = void 0;
    }
    update(maxWidth, maxHeight, margins) {
      this.maxWidth = maxWidth;
      this.maxHeight = maxHeight;
      this._margins = margins;
      this.setDimensions();
      this.buildLabels();
      this.fit();
    }
    setDimensions() {
      if (this.isHorizontal()) {
        this.width = this.maxWidth;
        this.left = this._margins.left;
        this.right = this.width;
      } else {
        this.height = this.maxHeight;
        this.top = this._margins.top;
        this.bottom = this.height;
      }
    }
    buildLabels() {
      const labelOpts = this.options.labels || {};
      let legendItems = callback(labelOpts.generateLabels, [
        this.chart
      ], this) || [];
      if (labelOpts.filter) {
        legendItems = legendItems.filter((item) => labelOpts.filter(item, this.chart.data));
      }
      if (labelOpts.sort) {
        legendItems = legendItems.sort((a, b) => labelOpts.sort(a, b, this.chart.data));
      }
      if (this.options.reverse) {
        legendItems.reverse();
      }
      this.legendItems = legendItems;
    }
    fit() {
      const { options, ctx } = this;
      if (!options.display) {
        this.width = this.height = 0;
        return;
      }
      const labelOpts = options.labels;
      const labelFont = toFont(labelOpts.font);
      const fontSize = labelFont.size;
      const titleHeight = this._computeTitleHeight();
      const { boxWidth, itemHeight } = getBoxSize(labelOpts, fontSize);
      let width, height;
      ctx.font = labelFont.string;
      if (this.isHorizontal()) {
        width = this.maxWidth;
        height = this._fitRows(titleHeight, fontSize, boxWidth, itemHeight) + 10;
      } else {
        height = this.maxHeight;
        width = this._fitCols(titleHeight, labelFont, boxWidth, itemHeight) + 10;
      }
      this.width = Math.min(width, options.maxWidth || this.maxWidth);
      this.height = Math.min(height, options.maxHeight || this.maxHeight);
    }
    _fitRows(titleHeight, fontSize, boxWidth, itemHeight) {
      const { ctx, maxWidth, options: { labels: { padding } } } = this;
      const hitboxes = this.legendHitBoxes = [];
      const lineWidths = this.lineWidths = [
        0
      ];
      const lineHeight = itemHeight + padding;
      let totalHeight = titleHeight;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      let row = -1;
      let top = -lineHeight;
      this.legendItems.forEach((legendItem, i) => {
        const itemWidth = boxWidth + fontSize / 2 + ctx.measureText(legendItem.text).width;
        if (i === 0 || lineWidths[lineWidths.length - 1] + itemWidth + 2 * padding > maxWidth) {
          totalHeight += lineHeight;
          lineWidths[lineWidths.length - (i > 0 ? 0 : 1)] = 0;
          top += lineHeight;
          row++;
        }
        hitboxes[i] = {
          left: 0,
          top,
          row,
          width: itemWidth,
          height: itemHeight
        };
        lineWidths[lineWidths.length - 1] += itemWidth + padding;
      });
      return totalHeight;
    }
    _fitCols(titleHeight, labelFont, boxWidth, _itemHeight) {
      const { ctx, maxHeight, options: { labels: { padding } } } = this;
      const hitboxes = this.legendHitBoxes = [];
      const columnSizes = this.columnSizes = [];
      const heightLimit = maxHeight - titleHeight;
      let totalWidth = padding;
      let currentColWidth = 0;
      let currentColHeight = 0;
      let left = 0;
      let col = 0;
      this.legendItems.forEach((legendItem, i) => {
        const { itemWidth, itemHeight } = calculateItemSize(boxWidth, labelFont, ctx, legendItem, _itemHeight);
        if (i > 0 && currentColHeight + itemHeight + 2 * padding > heightLimit) {
          totalWidth += currentColWidth + padding;
          columnSizes.push({
            width: currentColWidth,
            height: currentColHeight
          });
          left += currentColWidth + padding;
          col++;
          currentColWidth = currentColHeight = 0;
        }
        hitboxes[i] = {
          left,
          top: currentColHeight,
          col,
          width: itemWidth,
          height: itemHeight
        };
        currentColWidth = Math.max(currentColWidth, itemWidth);
        currentColHeight += itemHeight + padding;
      });
      totalWidth += currentColWidth;
      columnSizes.push({
        width: currentColWidth,
        height: currentColHeight
      });
      return totalWidth;
    }
    adjustHitBoxes() {
      if (!this.options.display) {
        return;
      }
      const titleHeight = this._computeTitleHeight();
      const { legendHitBoxes: hitboxes, options: { align, labels: { padding }, rtl } } = this;
      const rtlHelper = getRtlAdapter(rtl, this.left, this.width);
      if (this.isHorizontal()) {
        let row = 0;
        let left = _alignStartEnd(align, this.left + padding, this.right - this.lineWidths[row]);
        for (const hitbox of hitboxes) {
          if (row !== hitbox.row) {
            row = hitbox.row;
            left = _alignStartEnd(align, this.left + padding, this.right - this.lineWidths[row]);
          }
          hitbox.top += this.top + titleHeight + padding;
          hitbox.left = rtlHelper.leftForLtr(rtlHelper.x(left), hitbox.width);
          left += hitbox.width + padding;
        }
      } else {
        let col = 0;
        let top = _alignStartEnd(align, this.top + titleHeight + padding, this.bottom - this.columnSizes[col].height);
        for (const hitbox1 of hitboxes) {
          if (hitbox1.col !== col) {
            col = hitbox1.col;
            top = _alignStartEnd(align, this.top + titleHeight + padding, this.bottom - this.columnSizes[col].height);
          }
          hitbox1.top = top;
          hitbox1.left += this.left + padding;
          hitbox1.left = rtlHelper.leftForLtr(rtlHelper.x(hitbox1.left), hitbox1.width);
          top += hitbox1.height + padding;
        }
      }
    }
    isHorizontal() {
      return this.options.position === "top" || this.options.position === "bottom";
    }
    draw() {
      if (this.options.display) {
        const ctx = this.ctx;
        clipArea(ctx, this);
        this._draw();
        unclipArea(ctx);
      }
    }
    _draw() {
      const { options: opts, columnSizes, lineWidths, ctx } = this;
      const { align, labels: labelOpts } = opts;
      const defaultColor = defaults.color;
      const rtlHelper = getRtlAdapter(opts.rtl, this.left, this.width);
      const labelFont = toFont(labelOpts.font);
      const { padding } = labelOpts;
      const fontSize = labelFont.size;
      const halfFontSize = fontSize / 2;
      let cursor;
      this.drawTitle();
      ctx.textAlign = rtlHelper.textAlign("left");
      ctx.textBaseline = "middle";
      ctx.lineWidth = 0.5;
      ctx.font = labelFont.string;
      const { boxWidth, boxHeight, itemHeight } = getBoxSize(labelOpts, fontSize);
      const drawLegendBox = function(x, y, legendItem) {
        if (isNaN(boxWidth) || boxWidth <= 0 || isNaN(boxHeight) || boxHeight < 0) {
          return;
        }
        ctx.save();
        const lineWidth = valueOrDefault(legendItem.lineWidth, 1);
        ctx.fillStyle = valueOrDefault(legendItem.fillStyle, defaultColor);
        ctx.lineCap = valueOrDefault(legendItem.lineCap, "butt");
        ctx.lineDashOffset = valueOrDefault(legendItem.lineDashOffset, 0);
        ctx.lineJoin = valueOrDefault(legendItem.lineJoin, "miter");
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = valueOrDefault(legendItem.strokeStyle, defaultColor);
        ctx.setLineDash(valueOrDefault(legendItem.lineDash, []));
        if (labelOpts.usePointStyle) {
          const drawOptions = {
            radius: boxHeight * Math.SQRT2 / 2,
            pointStyle: legendItem.pointStyle,
            rotation: legendItem.rotation,
            borderWidth: lineWidth
          };
          const centerX = rtlHelper.xPlus(x, boxWidth / 2);
          const centerY = y + halfFontSize;
          drawPointLegend(ctx, drawOptions, centerX, centerY, labelOpts.pointStyleWidth && boxWidth);
        } else {
          const yBoxTop = y + Math.max((fontSize - boxHeight) / 2, 0);
          const xBoxLeft = rtlHelper.leftForLtr(x, boxWidth);
          const borderRadius = toTRBLCorners(legendItem.borderRadius);
          ctx.beginPath();
          if (Object.values(borderRadius).some((v) => v !== 0)) {
            addRoundedRectPath(ctx, {
              x: xBoxLeft,
              y: yBoxTop,
              w: boxWidth,
              h: boxHeight,
              radius: borderRadius
            });
          } else {
            ctx.rect(xBoxLeft, yBoxTop, boxWidth, boxHeight);
          }
          ctx.fill();
          if (lineWidth !== 0) {
            ctx.stroke();
          }
        }
        ctx.restore();
      };
      const fillText = function(x, y, legendItem) {
        renderText(ctx, legendItem.text, x, y + itemHeight / 2, labelFont, {
          strikethrough: legendItem.hidden,
          textAlign: rtlHelper.textAlign(legendItem.textAlign)
        });
      };
      const isHorizontal = this.isHorizontal();
      const titleHeight = this._computeTitleHeight();
      if (isHorizontal) {
        cursor = {
          x: _alignStartEnd(align, this.left + padding, this.right - lineWidths[0]),
          y: this.top + padding + titleHeight,
          line: 0
        };
      } else {
        cursor = {
          x: this.left + padding,
          y: _alignStartEnd(align, this.top + titleHeight + padding, this.bottom - columnSizes[0].height),
          line: 0
        };
      }
      overrideTextDirection(this.ctx, opts.textDirection);
      const lineHeight = itemHeight + padding;
      this.legendItems.forEach((legendItem, i) => {
        ctx.strokeStyle = legendItem.fontColor;
        ctx.fillStyle = legendItem.fontColor;
        const textWidth = ctx.measureText(legendItem.text).width;
        const textAlign = rtlHelper.textAlign(legendItem.textAlign || (legendItem.textAlign = labelOpts.textAlign));
        const width = boxWidth + halfFontSize + textWidth;
        let x = cursor.x;
        let y = cursor.y;
        rtlHelper.setWidth(this.width);
        if (isHorizontal) {
          if (i > 0 && x + width + padding > this.right) {
            y = cursor.y += lineHeight;
            cursor.line++;
            x = cursor.x = _alignStartEnd(align, this.left + padding, this.right - lineWidths[cursor.line]);
          }
        } else if (i > 0 && y + lineHeight > this.bottom) {
          x = cursor.x = x + columnSizes[cursor.line].width + padding;
          cursor.line++;
          y = cursor.y = _alignStartEnd(align, this.top + titleHeight + padding, this.bottom - columnSizes[cursor.line].height);
        }
        const realX = rtlHelper.x(x);
        drawLegendBox(realX, y, legendItem);
        x = _textX(textAlign, x + boxWidth + halfFontSize, isHorizontal ? x + width : this.right, opts.rtl);
        fillText(rtlHelper.x(x), y, legendItem);
        if (isHorizontal) {
          cursor.x += width + padding;
        } else if (typeof legendItem.text !== "string") {
          const fontLineHeight = labelFont.lineHeight;
          cursor.y += calculateLegendItemHeight(legendItem, fontLineHeight);
        } else {
          cursor.y += lineHeight;
        }
      });
      restoreTextDirection(this.ctx, opts.textDirection);
    }
    drawTitle() {
      const opts = this.options;
      const titleOpts = opts.title;
      const titleFont = toFont(titleOpts.font);
      const titlePadding = toPadding(titleOpts.padding);
      if (!titleOpts.display) {
        return;
      }
      const rtlHelper = getRtlAdapter(opts.rtl, this.left, this.width);
      const ctx = this.ctx;
      const position = titleOpts.position;
      const halfFontSize = titleFont.size / 2;
      const topPaddingPlusHalfFontSize = titlePadding.top + halfFontSize;
      let y;
      let left = this.left;
      let maxWidth = this.width;
      if (this.isHorizontal()) {
        maxWidth = Math.max(...this.lineWidths);
        y = this.top + topPaddingPlusHalfFontSize;
        left = _alignStartEnd(opts.align, left, this.right - maxWidth);
      } else {
        const maxHeight = this.columnSizes.reduce((acc, size) => Math.max(acc, size.height), 0);
        y = topPaddingPlusHalfFontSize + _alignStartEnd(opts.align, this.top, this.bottom - maxHeight - opts.labels.padding - this._computeTitleHeight());
      }
      const x = _alignStartEnd(position, left, left + maxWidth);
      ctx.textAlign = rtlHelper.textAlign(_toLeftRightCenter(position));
      ctx.textBaseline = "middle";
      ctx.strokeStyle = titleOpts.color;
      ctx.fillStyle = titleOpts.color;
      ctx.font = titleFont.string;
      renderText(ctx, titleOpts.text, x, y, titleFont);
    }
    _computeTitleHeight() {
      const titleOpts = this.options.title;
      const titleFont = toFont(titleOpts.font);
      const titlePadding = toPadding(titleOpts.padding);
      return titleOpts.display ? titleFont.lineHeight + titlePadding.height : 0;
    }
    _getLegendItemAt(x, y) {
      let i, hitBox, lh;
      if (_isBetween(x, this.left, this.right) && _isBetween(y, this.top, this.bottom)) {
        lh = this.legendHitBoxes;
        for (i = 0; i < lh.length; ++i) {
          hitBox = lh[i];
          if (_isBetween(x, hitBox.left, hitBox.left + hitBox.width) && _isBetween(y, hitBox.top, hitBox.top + hitBox.height)) {
            return this.legendItems[i];
          }
        }
      }
      return null;
    }
    handleEvent(e) {
      const opts = this.options;
      if (!isListened(e.type, opts)) {
        return;
      }
      const hoveredItem = this._getLegendItemAt(e.x, e.y);
      if (e.type === "mousemove" || e.type === "mouseout") {
        const previous = this._hoveredItem;
        const sameItem = itemsEqual(previous, hoveredItem);
        if (previous && !sameItem) {
          callback(opts.onLeave, [
            e,
            previous,
            this
          ], this);
        }
        this._hoveredItem = hoveredItem;
        if (hoveredItem && !sameItem) {
          callback(opts.onHover, [
            e,
            hoveredItem,
            this
          ], this);
        }
      } else if (hoveredItem) {
        callback(opts.onClick, [
          e,
          hoveredItem,
          this
        ], this);
      }
    }
  };
  function calculateItemSize(boxWidth, labelFont, ctx, legendItem, _itemHeight) {
    const itemWidth = calculateItemWidth(legendItem, boxWidth, labelFont, ctx);
    const itemHeight = calculateItemHeight(_itemHeight, legendItem, labelFont.lineHeight);
    return {
      itemWidth,
      itemHeight
    };
  }
  function calculateItemWidth(legendItem, boxWidth, labelFont, ctx) {
    let legendItemText = legendItem.text;
    if (legendItemText && typeof legendItemText !== "string") {
      legendItemText = legendItemText.reduce((a, b) => a.length > b.length ? a : b);
    }
    return boxWidth + labelFont.size / 2 + ctx.measureText(legendItemText).width;
  }
  function calculateItemHeight(_itemHeight, legendItem, fontLineHeight) {
    let itemHeight = _itemHeight;
    if (typeof legendItem.text !== "string") {
      itemHeight = calculateLegendItemHeight(legendItem, fontLineHeight);
    }
    return itemHeight;
  }
  function calculateLegendItemHeight(legendItem, fontLineHeight) {
    const labelHeight = legendItem.text ? legendItem.text.length + 0.5 : 0;
    return fontLineHeight * labelHeight;
  }
  function isListened(type2, opts) {
    if ((type2 === "mousemove" || type2 === "mouseout") && (opts.onHover || opts.onLeave)) {
      return true;
    }
    if (opts.onClick && (type2 === "click" || type2 === "mouseup")) {
      return true;
    }
    return false;
  }
  var plugin_legend = {
    id: "legend",
    _element: Legend,
    start(chart, _args, options) {
      const legend = chart.legend = new Legend({
        ctx: chart.ctx,
        options,
        chart
      });
      layouts.configure(chart, legend, options);
      layouts.addBox(chart, legend);
    },
    stop(chart) {
      layouts.removeBox(chart, chart.legend);
      delete chart.legend;
    },
    beforeUpdate(chart, _args, options) {
      const legend = chart.legend;
      layouts.configure(chart, legend, options);
      legend.options = options;
    },
    afterUpdate(chart) {
      const legend = chart.legend;
      legend.buildLabels();
      legend.adjustHitBoxes();
    },
    afterEvent(chart, args) {
      if (!args.replay) {
        chart.legend.handleEvent(args.event);
      }
    },
    defaults: {
      display: true,
      position: "top",
      align: "center",
      fullSize: true,
      reverse: false,
      weight: 1e3,
      onClick(e, legendItem, legend) {
        const index2 = legendItem.datasetIndex;
        const ci = legend.chart;
        if (ci.isDatasetVisible(index2)) {
          ci.hide(index2);
          legendItem.hidden = true;
        } else {
          ci.show(index2);
          legendItem.hidden = false;
        }
      },
      onHover: null,
      onLeave: null,
      labels: {
        color: (ctx) => ctx.chart.options.color,
        boxWidth: 40,
        padding: 10,
        generateLabels(chart) {
          const datasets = chart.data.datasets;
          const { labels: { usePointStyle, pointStyle, textAlign, color: color3, useBorderRadius, borderRadius } } = chart.legend.options;
          return chart._getSortedDatasetMetas().map((meta) => {
            const style = meta.controller.getStyle(usePointStyle ? 0 : void 0);
            const borderWidth = toPadding(style.borderWidth);
            return {
              text: datasets[meta.index].label,
              fillStyle: style.backgroundColor,
              fontColor: color3,
              hidden: !meta.visible,
              lineCap: style.borderCapStyle,
              lineDash: style.borderDash,
              lineDashOffset: style.borderDashOffset,
              lineJoin: style.borderJoinStyle,
              lineWidth: (borderWidth.width + borderWidth.height) / 4,
              strokeStyle: style.borderColor,
              pointStyle: pointStyle || style.pointStyle,
              rotation: style.rotation,
              textAlign: textAlign || style.textAlign,
              borderRadius: useBorderRadius && (borderRadius || style.borderRadius),
              datasetIndex: meta.index
            };
          }, this);
        }
      },
      title: {
        color: (ctx) => ctx.chart.options.color,
        display: false,
        position: "center",
        text: ""
      }
    },
    descriptors: {
      _scriptable: (name2) => !name2.startsWith("on"),
      labels: {
        _scriptable: (name2) => ![
          "generateLabels",
          "filter",
          "sort"
        ].includes(name2)
      }
    }
  };
  var Title = class extends Element {
    constructor(config) {
      super();
      this.chart = config.chart;
      this.options = config.options;
      this.ctx = config.ctx;
      this._padding = void 0;
      this.top = void 0;
      this.bottom = void 0;
      this.left = void 0;
      this.right = void 0;
      this.width = void 0;
      this.height = void 0;
      this.position = void 0;
      this.weight = void 0;
      this.fullSize = void 0;
    }
    update(maxWidth, maxHeight) {
      const opts = this.options;
      this.left = 0;
      this.top = 0;
      if (!opts.display) {
        this.width = this.height = this.right = this.bottom = 0;
        return;
      }
      this.width = this.right = maxWidth;
      this.height = this.bottom = maxHeight;
      const lineCount = isArray(opts.text) ? opts.text.length : 1;
      this._padding = toPadding(opts.padding);
      const textSize = lineCount * toFont(opts.font).lineHeight + this._padding.height;
      if (this.isHorizontal()) {
        this.height = textSize;
      } else {
        this.width = textSize;
      }
    }
    isHorizontal() {
      const pos = this.options.position;
      return pos === "top" || pos === "bottom";
    }
    _drawArgs(offset) {
      const { top, left, bottom, right, options } = this;
      const align = options.align;
      let rotation = 0;
      let maxWidth, titleX, titleY;
      if (this.isHorizontal()) {
        titleX = _alignStartEnd(align, left, right);
        titleY = top + offset;
        maxWidth = right - left;
      } else {
        if (options.position === "left") {
          titleX = left + offset;
          titleY = _alignStartEnd(align, bottom, top);
          rotation = PI * -0.5;
        } else {
          titleX = right - offset;
          titleY = _alignStartEnd(align, top, bottom);
          rotation = PI * 0.5;
        }
        maxWidth = bottom - top;
      }
      return {
        titleX,
        titleY,
        maxWidth,
        rotation
      };
    }
    draw() {
      const ctx = this.ctx;
      const opts = this.options;
      if (!opts.display) {
        return;
      }
      const fontOpts = toFont(opts.font);
      const lineHeight = fontOpts.lineHeight;
      const offset = lineHeight / 2 + this._padding.top;
      const { titleX, titleY, maxWidth, rotation } = this._drawArgs(offset);
      renderText(ctx, opts.text, 0, 0, fontOpts, {
        color: opts.color,
        maxWidth,
        rotation,
        textAlign: _toLeftRightCenter(opts.align),
        textBaseline: "middle",
        translation: [
          titleX,
          titleY
        ]
      });
    }
  };
  function createTitle(chart, titleOpts) {
    const title = new Title({
      ctx: chart.ctx,
      options: titleOpts,
      chart
    });
    layouts.configure(chart, title, titleOpts);
    layouts.addBox(chart, title);
    chart.titleBlock = title;
  }
  var plugin_title = {
    id: "title",
    _element: Title,
    start(chart, _args, options) {
      createTitle(chart, options);
    },
    stop(chart) {
      const titleBlock = chart.titleBlock;
      layouts.removeBox(chart, titleBlock);
      delete chart.titleBlock;
    },
    beforeUpdate(chart, _args, options) {
      const title = chart.titleBlock;
      layouts.configure(chart, title, options);
      title.options = options;
    },
    defaults: {
      align: "center",
      display: false,
      font: {
        weight: "bold"
      },
      fullSize: true,
      padding: 10,
      position: "top",
      text: "",
      weight: 2e3
    },
    defaultRoutes: {
      color: "color"
    },
    descriptors: {
      _scriptable: true,
      _indexable: false
    }
  };
  var map3 = /* @__PURE__ */ new WeakMap();
  var plugin_subtitle = {
    id: "subtitle",
    start(chart, _args, options) {
      const title = new Title({
        ctx: chart.ctx,
        options,
        chart
      });
      layouts.configure(chart, title, options);
      layouts.addBox(chart, title);
      map3.set(chart, title);
    },
    stop(chart) {
      layouts.removeBox(chart, map3.get(chart));
      map3.delete(chart);
    },
    beforeUpdate(chart, _args, options) {
      const title = map3.get(chart);
      layouts.configure(chart, title, options);
      title.options = options;
    },
    defaults: {
      align: "center",
      display: false,
      font: {
        weight: "normal"
      },
      fullSize: true,
      padding: 0,
      position: "top",
      text: "",
      weight: 1500
    },
    defaultRoutes: {
      color: "color"
    },
    descriptors: {
      _scriptable: true,
      _indexable: false
    }
  };
  var positioners = {
    average(items) {
      if (!items.length) {
        return false;
      }
      let i, len;
      let x = 0;
      let y = 0;
      let count = 0;
      for (i = 0, len = items.length; i < len; ++i) {
        const el = items[i].element;
        if (el && el.hasValue()) {
          const pos = el.tooltipPosition();
          x += pos.x;
          y += pos.y;
          ++count;
        }
      }
      return {
        x: x / count,
        y: y / count
      };
    },
    nearest(items, eventPosition) {
      if (!items.length) {
        return false;
      }
      let x = eventPosition.x;
      let y = eventPosition.y;
      let minDistance = Number.POSITIVE_INFINITY;
      let i, len, nearestElement;
      for (i = 0, len = items.length; i < len; ++i) {
        const el = items[i].element;
        if (el && el.hasValue()) {
          const center = el.getCenterPoint();
          const d = distanceBetweenPoints(eventPosition, center);
          if (d < minDistance) {
            minDistance = d;
            nearestElement = el;
          }
        }
      }
      if (nearestElement) {
        const tp = nearestElement.tooltipPosition();
        x = tp.x;
        y = tp.y;
      }
      return {
        x,
        y
      };
    }
  };
  function pushOrConcat(base, toPush) {
    if (toPush) {
      if (isArray(toPush)) {
        Array.prototype.push.apply(base, toPush);
      } else {
        base.push(toPush);
      }
    }
    return base;
  }
  function splitNewlines(str) {
    if ((typeof str === "string" || str instanceof String) && str.indexOf("\n") > -1) {
      return str.split("\n");
    }
    return str;
  }
  function createTooltipItem(chart, item) {
    const { element, datasetIndex, index: index2 } = item;
    const controller = chart.getDatasetMeta(datasetIndex).controller;
    const { label, value } = controller.getLabelAndValue(index2);
    return {
      chart,
      label,
      parsed: controller.getParsed(index2),
      raw: chart.data.datasets[datasetIndex].data[index2],
      formattedValue: value,
      dataset: controller.getDataset(),
      dataIndex: index2,
      datasetIndex,
      element
    };
  }
  function getTooltipSize(tooltip, options) {
    const ctx = tooltip.chart.ctx;
    const { body, footer, title } = tooltip;
    const { boxWidth, boxHeight } = options;
    const bodyFont = toFont(options.bodyFont);
    const titleFont = toFont(options.titleFont);
    const footerFont = toFont(options.footerFont);
    const titleLineCount = title.length;
    const footerLineCount = footer.length;
    const bodyLineItemCount = body.length;
    const padding = toPadding(options.padding);
    let height = padding.height;
    let width = 0;
    let combinedBodyLength = body.reduce((count, bodyItem) => count + bodyItem.before.length + bodyItem.lines.length + bodyItem.after.length, 0);
    combinedBodyLength += tooltip.beforeBody.length + tooltip.afterBody.length;
    if (titleLineCount) {
      height += titleLineCount * titleFont.lineHeight + (titleLineCount - 1) * options.titleSpacing + options.titleMarginBottom;
    }
    if (combinedBodyLength) {
      const bodyLineHeight = options.displayColors ? Math.max(boxHeight, bodyFont.lineHeight) : bodyFont.lineHeight;
      height += bodyLineItemCount * bodyLineHeight + (combinedBodyLength - bodyLineItemCount) * bodyFont.lineHeight + (combinedBodyLength - 1) * options.bodySpacing;
    }
    if (footerLineCount) {
      height += options.footerMarginTop + footerLineCount * footerFont.lineHeight + (footerLineCount - 1) * options.footerSpacing;
    }
    let widthPadding = 0;
    const maxLineWidth = function(line) {
      width = Math.max(width, ctx.measureText(line).width + widthPadding);
    };
    ctx.save();
    ctx.font = titleFont.string;
    each(tooltip.title, maxLineWidth);
    ctx.font = bodyFont.string;
    each(tooltip.beforeBody.concat(tooltip.afterBody), maxLineWidth);
    widthPadding = options.displayColors ? boxWidth + 2 + options.boxPadding : 0;
    each(body, (bodyItem) => {
      each(bodyItem.before, maxLineWidth);
      each(bodyItem.lines, maxLineWidth);
      each(bodyItem.after, maxLineWidth);
    });
    widthPadding = 0;
    ctx.font = footerFont.string;
    each(tooltip.footer, maxLineWidth);
    ctx.restore();
    width += padding.width;
    return {
      width,
      height
    };
  }
  function determineYAlign(chart, size) {
    const { y, height } = size;
    if (y < height / 2) {
      return "top";
    } else if (y > chart.height - height / 2) {
      return "bottom";
    }
    return "center";
  }
  function doesNotFitWithAlign(xAlign, chart, options, size) {
    const { x, width } = size;
    const caret = options.caretSize + options.caretPadding;
    if (xAlign === "left" && x + width + caret > chart.width) {
      return true;
    }
    if (xAlign === "right" && x - width - caret < 0) {
      return true;
    }
  }
  function determineXAlign(chart, options, size, yAlign) {
    const { x, width } = size;
    const { width: chartWidth, chartArea: { left, right } } = chart;
    let xAlign = "center";
    if (yAlign === "center") {
      xAlign = x <= (left + right) / 2 ? "left" : "right";
    } else if (x <= width / 2) {
      xAlign = "left";
    } else if (x >= chartWidth - width / 2) {
      xAlign = "right";
    }
    if (doesNotFitWithAlign(xAlign, chart, options, size)) {
      xAlign = "center";
    }
    return xAlign;
  }
  function determineAlignment(chart, options, size) {
    const yAlign = size.yAlign || options.yAlign || determineYAlign(chart, size);
    return {
      xAlign: size.xAlign || options.xAlign || determineXAlign(chart, options, size, yAlign),
      yAlign
    };
  }
  function alignX(size, xAlign) {
    let { x, width } = size;
    if (xAlign === "right") {
      x -= width;
    } else if (xAlign === "center") {
      x -= width / 2;
    }
    return x;
  }
  function alignY(size, yAlign, paddingAndSize) {
    let { y, height } = size;
    if (yAlign === "top") {
      y += paddingAndSize;
    } else if (yAlign === "bottom") {
      y -= height + paddingAndSize;
    } else {
      y -= height / 2;
    }
    return y;
  }
  function getBackgroundPoint(options, size, alignment, chart) {
    const { caretSize, caretPadding, cornerRadius } = options;
    const { xAlign, yAlign } = alignment;
    const paddingAndSize = caretSize + caretPadding;
    const { topLeft, topRight, bottomLeft, bottomRight } = toTRBLCorners(cornerRadius);
    let x = alignX(size, xAlign);
    const y = alignY(size, yAlign, paddingAndSize);
    if (yAlign === "center") {
      if (xAlign === "left") {
        x += paddingAndSize;
      } else if (xAlign === "right") {
        x -= paddingAndSize;
      }
    } else if (xAlign === "left") {
      x -= Math.max(topLeft, bottomLeft) + caretSize;
    } else if (xAlign === "right") {
      x += Math.max(topRight, bottomRight) + caretSize;
    }
    return {
      x: _limitValue(x, 0, chart.width - size.width),
      y: _limitValue(y, 0, chart.height - size.height)
    };
  }
  function getAlignedX(tooltip, align, options) {
    const padding = toPadding(options.padding);
    return align === "center" ? tooltip.x + tooltip.width / 2 : align === "right" ? tooltip.x + tooltip.width - padding.right : tooltip.x + padding.left;
  }
  function getBeforeAfterBodyLines(callback2) {
    return pushOrConcat([], splitNewlines(callback2));
  }
  function createTooltipContext(parent, tooltip, tooltipItems) {
    return createContext(parent, {
      tooltip,
      tooltipItems,
      type: "tooltip"
    });
  }
  function overrideCallbacks(callbacks, context) {
    const override = context && context.dataset && context.dataset.tooltip && context.dataset.tooltip.callbacks;
    return override ? callbacks.override(override) : callbacks;
  }
  var defaultCallbacks = {
    beforeTitle: noop2,
    title(tooltipItems) {
      if (tooltipItems.length > 0) {
        const item = tooltipItems[0];
        const labels = item.chart.data.labels;
        const labelCount = labels ? labels.length : 0;
        if (this && this.options && this.options.mode === "dataset") {
          return item.dataset.label || "";
        } else if (item.label) {
          return item.label;
        } else if (labelCount > 0 && item.dataIndex < labelCount) {
          return labels[item.dataIndex];
        }
      }
      return "";
    },
    afterTitle: noop2,
    beforeBody: noop2,
    beforeLabel: noop2,
    label(tooltipItem) {
      if (this && this.options && this.options.mode === "dataset") {
        return tooltipItem.label + ": " + tooltipItem.formattedValue || tooltipItem.formattedValue;
      }
      let label = tooltipItem.dataset.label || "";
      if (label) {
        label += ": ";
      }
      const value = tooltipItem.formattedValue;
      if (!isNullOrUndef(value)) {
        label += value;
      }
      return label;
    },
    labelColor(tooltipItem) {
      const meta = tooltipItem.chart.getDatasetMeta(tooltipItem.datasetIndex);
      const options = meta.controller.getStyle(tooltipItem.dataIndex);
      return {
        borderColor: options.borderColor,
        backgroundColor: options.backgroundColor,
        borderWidth: options.borderWidth,
        borderDash: options.borderDash,
        borderDashOffset: options.borderDashOffset,
        borderRadius: 0
      };
    },
    labelTextColor() {
      return this.options.bodyColor;
    },
    labelPointStyle(tooltipItem) {
      const meta = tooltipItem.chart.getDatasetMeta(tooltipItem.datasetIndex);
      const options = meta.controller.getStyle(tooltipItem.dataIndex);
      return {
        pointStyle: options.pointStyle,
        rotation: options.rotation
      };
    },
    afterLabel: noop2,
    afterBody: noop2,
    beforeFooter: noop2,
    footer: noop2,
    afterFooter: noop2
  };
  function invokeCallbackWithFallback(callbacks, name2, ctx, arg) {
    const result = callbacks[name2].call(ctx, arg);
    if (typeof result === "undefined") {
      return defaultCallbacks[name2].call(ctx, arg);
    }
    return result;
  }
  var Tooltip = class extends Element {
    constructor(config) {
      super();
      this.opacity = 0;
      this._active = [];
      this._eventPosition = void 0;
      this._size = void 0;
      this._cachedAnimations = void 0;
      this._tooltipItems = [];
      this.$animations = void 0;
      this.$context = void 0;
      this.chart = config.chart;
      this.options = config.options;
      this.dataPoints = void 0;
      this.title = void 0;
      this.beforeBody = void 0;
      this.body = void 0;
      this.afterBody = void 0;
      this.footer = void 0;
      this.xAlign = void 0;
      this.yAlign = void 0;
      this.x = void 0;
      this.y = void 0;
      this.height = void 0;
      this.width = void 0;
      this.caretX = void 0;
      this.caretY = void 0;
      this.labelColors = void 0;
      this.labelPointStyles = void 0;
      this.labelTextColors = void 0;
    }
    initialize(options) {
      this.options = options;
      this._cachedAnimations = void 0;
      this.$context = void 0;
    }
    _resolveAnimations() {
      const cached = this._cachedAnimations;
      if (cached) {
        return cached;
      }
      const chart = this.chart;
      const options = this.options.setContext(this.getContext());
      const opts = options.enabled && chart.options.animation && options.animations;
      const animations = new Animations(this.chart, opts);
      if (opts._cacheable) {
        this._cachedAnimations = Object.freeze(animations);
      }
      return animations;
    }
    getContext() {
      return this.$context || (this.$context = createTooltipContext(this.chart.getContext(), this, this._tooltipItems));
    }
    getTitle(context, options) {
      const { callbacks } = options;
      const beforeTitle = invokeCallbackWithFallback(callbacks, "beforeTitle", this, context);
      const title = invokeCallbackWithFallback(callbacks, "title", this, context);
      const afterTitle = invokeCallbackWithFallback(callbacks, "afterTitle", this, context);
      let lines = [];
      lines = pushOrConcat(lines, splitNewlines(beforeTitle));
      lines = pushOrConcat(lines, splitNewlines(title));
      lines = pushOrConcat(lines, splitNewlines(afterTitle));
      return lines;
    }
    getBeforeBody(tooltipItems, options) {
      return getBeforeAfterBodyLines(invokeCallbackWithFallback(options.callbacks, "beforeBody", this, tooltipItems));
    }
    getBody(tooltipItems, options) {
      const { callbacks } = options;
      const bodyItems = [];
      each(tooltipItems, (context) => {
        const bodyItem = {
          before: [],
          lines: [],
          after: []
        };
        const scoped = overrideCallbacks(callbacks, context);
        pushOrConcat(bodyItem.before, splitNewlines(invokeCallbackWithFallback(scoped, "beforeLabel", this, context)));
        pushOrConcat(bodyItem.lines, invokeCallbackWithFallback(scoped, "label", this, context));
        pushOrConcat(bodyItem.after, splitNewlines(invokeCallbackWithFallback(scoped, "afterLabel", this, context)));
        bodyItems.push(bodyItem);
      });
      return bodyItems;
    }
    getAfterBody(tooltipItems, options) {
      return getBeforeAfterBodyLines(invokeCallbackWithFallback(options.callbacks, "afterBody", this, tooltipItems));
    }
    getFooter(tooltipItems, options) {
      const { callbacks } = options;
      const beforeFooter = invokeCallbackWithFallback(callbacks, "beforeFooter", this, tooltipItems);
      const footer = invokeCallbackWithFallback(callbacks, "footer", this, tooltipItems);
      const afterFooter = invokeCallbackWithFallback(callbacks, "afterFooter", this, tooltipItems);
      let lines = [];
      lines = pushOrConcat(lines, splitNewlines(beforeFooter));
      lines = pushOrConcat(lines, splitNewlines(footer));
      lines = pushOrConcat(lines, splitNewlines(afterFooter));
      return lines;
    }
    _createItems(options) {
      const active = this._active;
      const data = this.chart.data;
      const labelColors = [];
      const labelPointStyles = [];
      const labelTextColors = [];
      let tooltipItems = [];
      let i, len;
      for (i = 0, len = active.length; i < len; ++i) {
        tooltipItems.push(createTooltipItem(this.chart, active[i]));
      }
      if (options.filter) {
        tooltipItems = tooltipItems.filter((element, index2, array2) => options.filter(element, index2, array2, data));
      }
      if (options.itemSort) {
        tooltipItems = tooltipItems.sort((a, b) => options.itemSort(a, b, data));
      }
      each(tooltipItems, (context) => {
        const scoped = overrideCallbacks(options.callbacks, context);
        labelColors.push(invokeCallbackWithFallback(scoped, "labelColor", this, context));
        labelPointStyles.push(invokeCallbackWithFallback(scoped, "labelPointStyle", this, context));
        labelTextColors.push(invokeCallbackWithFallback(scoped, "labelTextColor", this, context));
      });
      this.labelColors = labelColors;
      this.labelPointStyles = labelPointStyles;
      this.labelTextColors = labelTextColors;
      this.dataPoints = tooltipItems;
      return tooltipItems;
    }
    update(changed, replay) {
      const options = this.options.setContext(this.getContext());
      const active = this._active;
      let properties;
      let tooltipItems = [];
      if (!active.length) {
        if (this.opacity !== 0) {
          properties = {
            opacity: 0
          };
        }
      } else {
        const position = positioners[options.position].call(this, active, this._eventPosition);
        tooltipItems = this._createItems(options);
        this.title = this.getTitle(tooltipItems, options);
        this.beforeBody = this.getBeforeBody(tooltipItems, options);
        this.body = this.getBody(tooltipItems, options);
        this.afterBody = this.getAfterBody(tooltipItems, options);
        this.footer = this.getFooter(tooltipItems, options);
        const size = this._size = getTooltipSize(this, options);
        const positionAndSize = Object.assign({}, position, size);
        const alignment = determineAlignment(this.chart, options, positionAndSize);
        const backgroundPoint = getBackgroundPoint(options, positionAndSize, alignment, this.chart);
        this.xAlign = alignment.xAlign;
        this.yAlign = alignment.yAlign;
        properties = {
          opacity: 1,
          x: backgroundPoint.x,
          y: backgroundPoint.y,
          width: size.width,
          height: size.height,
          caretX: position.x,
          caretY: position.y
        };
      }
      this._tooltipItems = tooltipItems;
      this.$context = void 0;
      if (properties) {
        this._resolveAnimations().update(this, properties);
      }
      if (changed && options.external) {
        options.external.call(this, {
          chart: this.chart,
          tooltip: this,
          replay
        });
      }
    }
    drawCaret(tooltipPoint, ctx, size, options) {
      const caretPosition = this.getCaretPosition(tooltipPoint, size, options);
      ctx.lineTo(caretPosition.x1, caretPosition.y1);
      ctx.lineTo(caretPosition.x2, caretPosition.y2);
      ctx.lineTo(caretPosition.x3, caretPosition.y3);
    }
    getCaretPosition(tooltipPoint, size, options) {
      const { xAlign, yAlign } = this;
      const { caretSize, cornerRadius } = options;
      const { topLeft, topRight, bottomLeft, bottomRight } = toTRBLCorners(cornerRadius);
      const { x: ptX, y: ptY } = tooltipPoint;
      const { width, height } = size;
      let x1, x2, x3, y1, y2, y3;
      if (yAlign === "center") {
        y2 = ptY + height / 2;
        if (xAlign === "left") {
          x1 = ptX;
          x2 = x1 - caretSize;
          y1 = y2 + caretSize;
          y3 = y2 - caretSize;
        } else {
          x1 = ptX + width;
          x2 = x1 + caretSize;
          y1 = y2 - caretSize;
          y3 = y2 + caretSize;
        }
        x3 = x1;
      } else {
        if (xAlign === "left") {
          x2 = ptX + Math.max(topLeft, bottomLeft) + caretSize;
        } else if (xAlign === "right") {
          x2 = ptX + width - Math.max(topRight, bottomRight) - caretSize;
        } else {
          x2 = this.caretX;
        }
        if (yAlign === "top") {
          y1 = ptY;
          y2 = y1 - caretSize;
          x1 = x2 - caretSize;
          x3 = x2 + caretSize;
        } else {
          y1 = ptY + height;
          y2 = y1 + caretSize;
          x1 = x2 + caretSize;
          x3 = x2 - caretSize;
        }
        y3 = y1;
      }
      return {
        x1,
        x2,
        x3,
        y1,
        y2,
        y3
      };
    }
    drawTitle(pt, ctx, options) {
      const title = this.title;
      const length = title.length;
      let titleFont, titleSpacing, i;
      if (length) {
        const rtlHelper = getRtlAdapter(options.rtl, this.x, this.width);
        pt.x = getAlignedX(this, options.titleAlign, options);
        ctx.textAlign = rtlHelper.textAlign(options.titleAlign);
        ctx.textBaseline = "middle";
        titleFont = toFont(options.titleFont);
        titleSpacing = options.titleSpacing;
        ctx.fillStyle = options.titleColor;
        ctx.font = titleFont.string;
        for (i = 0; i < length; ++i) {
          ctx.fillText(title[i], rtlHelper.x(pt.x), pt.y + titleFont.lineHeight / 2);
          pt.y += titleFont.lineHeight + titleSpacing;
          if (i + 1 === length) {
            pt.y += options.titleMarginBottom - titleSpacing;
          }
        }
      }
    }
    _drawColorBox(ctx, pt, i, rtlHelper, options) {
      const labelColors = this.labelColors[i];
      const labelPointStyle = this.labelPointStyles[i];
      const { boxHeight, boxWidth, boxPadding } = options;
      const bodyFont = toFont(options.bodyFont);
      const colorX = getAlignedX(this, "left", options);
      const rtlColorX = rtlHelper.x(colorX);
      const yOffSet = boxHeight < bodyFont.lineHeight ? (bodyFont.lineHeight - boxHeight) / 2 : 0;
      const colorY = pt.y + yOffSet;
      if (options.usePointStyle) {
        const drawOptions = {
          radius: Math.min(boxWidth, boxHeight) / 2,
          pointStyle: labelPointStyle.pointStyle,
          rotation: labelPointStyle.rotation,
          borderWidth: 1
        };
        const centerX = rtlHelper.leftForLtr(rtlColorX, boxWidth) + boxWidth / 2;
        const centerY = colorY + boxHeight / 2;
        ctx.strokeStyle = options.multiKeyBackground;
        ctx.fillStyle = options.multiKeyBackground;
        drawPoint(ctx, drawOptions, centerX, centerY);
        ctx.strokeStyle = labelColors.borderColor;
        ctx.fillStyle = labelColors.backgroundColor;
        drawPoint(ctx, drawOptions, centerX, centerY);
      } else {
        ctx.lineWidth = isObject(labelColors.borderWidth) ? Math.max(...Object.values(labelColors.borderWidth)) : labelColors.borderWidth || 1;
        ctx.strokeStyle = labelColors.borderColor;
        ctx.setLineDash(labelColors.borderDash || []);
        ctx.lineDashOffset = labelColors.borderDashOffset || 0;
        const outerX = rtlHelper.leftForLtr(rtlColorX, boxWidth - boxPadding);
        const innerX = rtlHelper.leftForLtr(rtlHelper.xPlus(rtlColorX, 1), boxWidth - boxPadding - 2);
        const borderRadius = toTRBLCorners(labelColors.borderRadius);
        if (Object.values(borderRadius).some((v) => v !== 0)) {
          ctx.beginPath();
          ctx.fillStyle = options.multiKeyBackground;
          addRoundedRectPath(ctx, {
            x: outerX,
            y: colorY,
            w: boxWidth,
            h: boxHeight,
            radius: borderRadius
          });
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = labelColors.backgroundColor;
          ctx.beginPath();
          addRoundedRectPath(ctx, {
            x: innerX,
            y: colorY + 1,
            w: boxWidth - 2,
            h: boxHeight - 2,
            radius: borderRadius
          });
          ctx.fill();
        } else {
          ctx.fillStyle = options.multiKeyBackground;
          ctx.fillRect(outerX, colorY, boxWidth, boxHeight);
          ctx.strokeRect(outerX, colorY, boxWidth, boxHeight);
          ctx.fillStyle = labelColors.backgroundColor;
          ctx.fillRect(innerX, colorY + 1, boxWidth - 2, boxHeight - 2);
        }
      }
      ctx.fillStyle = this.labelTextColors[i];
    }
    drawBody(pt, ctx, options) {
      const { body } = this;
      const { bodySpacing, bodyAlign, displayColors, boxHeight, boxWidth, boxPadding } = options;
      const bodyFont = toFont(options.bodyFont);
      let bodyLineHeight = bodyFont.lineHeight;
      let xLinePadding = 0;
      const rtlHelper = getRtlAdapter(options.rtl, this.x, this.width);
      const fillLineOfText = function(line) {
        ctx.fillText(line, rtlHelper.x(pt.x + xLinePadding), pt.y + bodyLineHeight / 2);
        pt.y += bodyLineHeight + bodySpacing;
      };
      const bodyAlignForCalculation = rtlHelper.textAlign(bodyAlign);
      let bodyItem, textColor, lines, i, j, ilen, jlen;
      ctx.textAlign = bodyAlign;
      ctx.textBaseline = "middle";
      ctx.font = bodyFont.string;
      pt.x = getAlignedX(this, bodyAlignForCalculation, options);
      ctx.fillStyle = options.bodyColor;
      each(this.beforeBody, fillLineOfText);
      xLinePadding = displayColors && bodyAlignForCalculation !== "right" ? bodyAlign === "center" ? boxWidth / 2 + boxPadding : boxWidth + 2 + boxPadding : 0;
      for (i = 0, ilen = body.length; i < ilen; ++i) {
        bodyItem = body[i];
        textColor = this.labelTextColors[i];
        ctx.fillStyle = textColor;
        each(bodyItem.before, fillLineOfText);
        lines = bodyItem.lines;
        if (displayColors && lines.length) {
          this._drawColorBox(ctx, pt, i, rtlHelper, options);
          bodyLineHeight = Math.max(bodyFont.lineHeight, boxHeight);
        }
        for (j = 0, jlen = lines.length; j < jlen; ++j) {
          fillLineOfText(lines[j]);
          bodyLineHeight = bodyFont.lineHeight;
        }
        each(bodyItem.after, fillLineOfText);
      }
      xLinePadding = 0;
      bodyLineHeight = bodyFont.lineHeight;
      each(this.afterBody, fillLineOfText);
      pt.y -= bodySpacing;
    }
    drawFooter(pt, ctx, options) {
      const footer = this.footer;
      const length = footer.length;
      let footerFont, i;
      if (length) {
        const rtlHelper = getRtlAdapter(options.rtl, this.x, this.width);
        pt.x = getAlignedX(this, options.footerAlign, options);
        pt.y += options.footerMarginTop;
        ctx.textAlign = rtlHelper.textAlign(options.footerAlign);
        ctx.textBaseline = "middle";
        footerFont = toFont(options.footerFont);
        ctx.fillStyle = options.footerColor;
        ctx.font = footerFont.string;
        for (i = 0; i < length; ++i) {
          ctx.fillText(footer[i], rtlHelper.x(pt.x), pt.y + footerFont.lineHeight / 2);
          pt.y += footerFont.lineHeight + options.footerSpacing;
        }
      }
    }
    drawBackground(pt, ctx, tooltipSize, options) {
      const { xAlign, yAlign } = this;
      const { x, y } = pt;
      const { width, height } = tooltipSize;
      const { topLeft, topRight, bottomLeft, bottomRight } = toTRBLCorners(options.cornerRadius);
      ctx.fillStyle = options.backgroundColor;
      ctx.strokeStyle = options.borderColor;
      ctx.lineWidth = options.borderWidth;
      ctx.beginPath();
      ctx.moveTo(x + topLeft, y);
      if (yAlign === "top") {
        this.drawCaret(pt, ctx, tooltipSize, options);
      }
      ctx.lineTo(x + width - topRight, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + topRight);
      if (yAlign === "center" && xAlign === "right") {
        this.drawCaret(pt, ctx, tooltipSize, options);
      }
      ctx.lineTo(x + width, y + height - bottomRight);
      ctx.quadraticCurveTo(x + width, y + height, x + width - bottomRight, y + height);
      if (yAlign === "bottom") {
        this.drawCaret(pt, ctx, tooltipSize, options);
      }
      ctx.lineTo(x + bottomLeft, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - bottomLeft);
      if (yAlign === "center" && xAlign === "left") {
        this.drawCaret(pt, ctx, tooltipSize, options);
      }
      ctx.lineTo(x, y + topLeft);
      ctx.quadraticCurveTo(x, y, x + topLeft, y);
      ctx.closePath();
      ctx.fill();
      if (options.borderWidth > 0) {
        ctx.stroke();
      }
    }
    _updateAnimationTarget(options) {
      const chart = this.chart;
      const anims = this.$animations;
      const animX = anims && anims.x;
      const animY = anims && anims.y;
      if (animX || animY) {
        const position = positioners[options.position].call(this, this._active, this._eventPosition);
        if (!position) {
          return;
        }
        const size = this._size = getTooltipSize(this, options);
        const positionAndSize = Object.assign({}, position, this._size);
        const alignment = determineAlignment(chart, options, positionAndSize);
        const point = getBackgroundPoint(options, positionAndSize, alignment, chart);
        if (animX._to !== point.x || animY._to !== point.y) {
          this.xAlign = alignment.xAlign;
          this.yAlign = alignment.yAlign;
          this.width = size.width;
          this.height = size.height;
          this.caretX = position.x;
          this.caretY = position.y;
          this._resolveAnimations().update(this, point);
        }
      }
    }
    _willRender() {
      return !!this.opacity;
    }
    draw(ctx) {
      const options = this.options.setContext(this.getContext());
      let opacity = this.opacity;
      if (!opacity) {
        return;
      }
      this._updateAnimationTarget(options);
      const tooltipSize = {
        width: this.width,
        height: this.height
      };
      const pt = {
        x: this.x,
        y: this.y
      };
      opacity = Math.abs(opacity) < 1e-3 ? 0 : opacity;
      const padding = toPadding(options.padding);
      const hasTooltipContent = this.title.length || this.beforeBody.length || this.body.length || this.afterBody.length || this.footer.length;
      if (options.enabled && hasTooltipContent) {
        ctx.save();
        ctx.globalAlpha = opacity;
        this.drawBackground(pt, ctx, tooltipSize, options);
        overrideTextDirection(ctx, options.textDirection);
        pt.y += padding.top;
        this.drawTitle(pt, ctx, options);
        this.drawBody(pt, ctx, options);
        this.drawFooter(pt, ctx, options);
        restoreTextDirection(ctx, options.textDirection);
        ctx.restore();
      }
    }
    getActiveElements() {
      return this._active || [];
    }
    setActiveElements(activeElements, eventPosition) {
      const lastActive = this._active;
      const active = activeElements.map(({ datasetIndex, index: index2 }) => {
        const meta = this.chart.getDatasetMeta(datasetIndex);
        if (!meta) {
          throw new Error("Cannot find a dataset at index " + datasetIndex);
        }
        return {
          datasetIndex,
          element: meta.data[index2],
          index: index2
        };
      });
      const changed = !_elementsEqual(lastActive, active);
      const positionChanged = this._positionChanged(active, eventPosition);
      if (changed || positionChanged) {
        this._active = active;
        this._eventPosition = eventPosition;
        this._ignoreReplayEvents = true;
        this.update(true);
      }
    }
    handleEvent(e, replay, inChartArea = true) {
      if (replay && this._ignoreReplayEvents) {
        return false;
      }
      this._ignoreReplayEvents = false;
      const options = this.options;
      const lastActive = this._active || [];
      const active = this._getActiveElements(e, lastActive, replay, inChartArea);
      const positionChanged = this._positionChanged(active, e);
      const changed = replay || !_elementsEqual(active, lastActive) || positionChanged;
      if (changed) {
        this._active = active;
        if (options.enabled || options.external) {
          this._eventPosition = {
            x: e.x,
            y: e.y
          };
          this.update(true, replay);
        }
      }
      return changed;
    }
    _getActiveElements(e, lastActive, replay, inChartArea) {
      const options = this.options;
      if (e.type === "mouseout") {
        return [];
      }
      if (!inChartArea) {
        return lastActive;
      }
      const active = this.chart.getElementsAtEventForMode(e, options.mode, options, replay);
      if (options.reverse) {
        active.reverse();
      }
      return active;
    }
    _positionChanged(active, e) {
      const { caretX, caretY, options } = this;
      const position = positioners[options.position].call(this, active, e);
      return position !== false && (caretX !== position.x || caretY !== position.y);
    }
  };
  __publicField(Tooltip, "positioners", positioners);
  var plugin_tooltip = {
    id: "tooltip",
    _element: Tooltip,
    positioners,
    afterInit(chart, _args, options) {
      if (options) {
        chart.tooltip = new Tooltip({
          chart,
          options
        });
      }
    },
    beforeUpdate(chart, _args, options) {
      if (chart.tooltip) {
        chart.tooltip.initialize(options);
      }
    },
    reset(chart, _args, options) {
      if (chart.tooltip) {
        chart.tooltip.initialize(options);
      }
    },
    afterDraw(chart) {
      const tooltip = chart.tooltip;
      if (tooltip && tooltip._willRender()) {
        const args = {
          tooltip
        };
        if (chart.notifyPlugins("beforeTooltipDraw", {
          ...args,
          cancelable: true
        }) === false) {
          return;
        }
        tooltip.draw(chart.ctx);
        chart.notifyPlugins("afterTooltipDraw", args);
      }
    },
    afterEvent(chart, args) {
      if (chart.tooltip) {
        const useFinalPosition = args.replay;
        if (chart.tooltip.handleEvent(args.event, useFinalPosition, args.inChartArea)) {
          args.changed = true;
        }
      }
    },
    defaults: {
      enabled: true,
      external: null,
      position: "average",
      backgroundColor: "rgba(0,0,0,0.8)",
      titleColor: "#fff",
      titleFont: {
        weight: "bold"
      },
      titleSpacing: 2,
      titleMarginBottom: 6,
      titleAlign: "left",
      bodyColor: "#fff",
      bodySpacing: 2,
      bodyFont: {},
      bodyAlign: "left",
      footerColor: "#fff",
      footerSpacing: 2,
      footerMarginTop: 6,
      footerFont: {
        weight: "bold"
      },
      footerAlign: "left",
      padding: 6,
      caretPadding: 2,
      caretSize: 5,
      cornerRadius: 6,
      boxHeight: (ctx, opts) => opts.bodyFont.size,
      boxWidth: (ctx, opts) => opts.bodyFont.size,
      multiKeyBackground: "#fff",
      displayColors: true,
      boxPadding: 0,
      borderColor: "rgba(0,0,0,0)",
      borderWidth: 0,
      animation: {
        duration: 400,
        easing: "easeOutQuart"
      },
      animations: {
        numbers: {
          type: "number",
          properties: [
            "x",
            "y",
            "width",
            "height",
            "caretX",
            "caretY"
          ]
        },
        opacity: {
          easing: "linear",
          duration: 200
        }
      },
      callbacks: defaultCallbacks
    },
    defaultRoutes: {
      bodyFont: "font",
      footerFont: "font",
      titleFont: "font"
    },
    descriptors: {
      _scriptable: (name2) => name2 !== "filter" && name2 !== "itemSort" && name2 !== "external",
      _indexable: false,
      callbacks: {
        _scriptable: false,
        _indexable: false
      },
      animation: {
        _fallback: false
      },
      animations: {
        _fallback: "animation"
      }
    },
    additionalOptionScopes: [
      "interaction"
    ]
  };
  var plugins = /* @__PURE__ */ Object.freeze({
    __proto__: null,
    Colors: plugin_colors,
    Decimation: plugin_decimation,
    Filler: index,
    Legend: plugin_legend,
    SubTitle: plugin_subtitle,
    Title: plugin_title,
    Tooltip: plugin_tooltip
  });
  var addIfString = (labels, raw, index2, addedLabels) => {
    if (typeof raw === "string") {
      index2 = labels.push(raw) - 1;
      addedLabels.unshift({
        index: index2,
        label: raw
      });
    } else if (isNaN(raw)) {
      index2 = null;
    }
    return index2;
  };
  function findOrAddLabel(labels, raw, index2, addedLabels) {
    const first = labels.indexOf(raw);
    if (first === -1) {
      return addIfString(labels, raw, index2, addedLabels);
    }
    const last = labels.lastIndexOf(raw);
    return first !== last ? index2 : first;
  }
  var validIndex = (index2, max2) => index2 === null ? null : _limitValue(Math.round(index2), 0, max2);
  function _getLabelForValue(value) {
    const labels = this.getLabels();
    if (value >= 0 && value < labels.length) {
      return labels[value];
    }
    return value;
  }
  var CategoryScale = class extends Scale {
    constructor(cfg) {
      super(cfg);
      this._startValue = void 0;
      this._valueRange = 0;
      this._addedLabels = [];
    }
    init(scaleOptions) {
      const added = this._addedLabels;
      if (added.length) {
        const labels = this.getLabels();
        for (const { index: index2, label } of added) {
          if (labels[index2] === label) {
            labels.splice(index2, 1);
          }
        }
        this._addedLabels = [];
      }
      super.init(scaleOptions);
    }
    parse(raw, index2) {
      if (isNullOrUndef(raw)) {
        return null;
      }
      const labels = this.getLabels();
      index2 = isFinite(index2) && labels[index2] === raw ? index2 : findOrAddLabel(labels, raw, valueOrDefault(index2, raw), this._addedLabels);
      return validIndex(index2, labels.length - 1);
    }
    determineDataLimits() {
      const { minDefined, maxDefined } = this.getUserBounds();
      let { min: min2, max: max2 } = this.getMinMax(true);
      if (this.options.bounds === "ticks") {
        if (!minDefined) {
          min2 = 0;
        }
        if (!maxDefined) {
          max2 = this.getLabels().length - 1;
        }
      }
      this.min = min2;
      this.max = max2;
    }
    buildTicks() {
      const min2 = this.min;
      const max2 = this.max;
      const offset = this.options.offset;
      const ticks2 = [];
      let labels = this.getLabels();
      labels = min2 === 0 && max2 === labels.length - 1 ? labels : labels.slice(min2, max2 + 1);
      this._valueRange = Math.max(labels.length - (offset ? 0 : 1), 1);
      this._startValue = this.min - (offset ? 0.5 : 0);
      for (let value = min2; value <= max2; value++) {
        ticks2.push({
          value
        });
      }
      return ticks2;
    }
    getLabelForValue(value) {
      return _getLabelForValue.call(this, value);
    }
    configure() {
      super.configure();
      if (!this.isHorizontal()) {
        this._reversePixels = !this._reversePixels;
      }
    }
    getPixelForValue(value) {
      if (typeof value !== "number") {
        value = this.parse(value);
      }
      return value === null ? NaN : this.getPixelForDecimal((value - this._startValue) / this._valueRange);
    }
    getPixelForTick(index2) {
      const ticks2 = this.ticks;
      if (index2 < 0 || index2 > ticks2.length - 1) {
        return null;
      }
      return this.getPixelForValue(ticks2[index2].value);
    }
    getValueForPixel(pixel) {
      return Math.round(this._startValue + this.getDecimalForPixel(pixel) * this._valueRange);
    }
    getBasePixel() {
      return this.bottom;
    }
  };
  __publicField(CategoryScale, "id", "category");
  __publicField(CategoryScale, "defaults", {
    ticks: {
      callback: _getLabelForValue
    }
  });
  function generateTicks$1(generationOptions, dataRange) {
    const ticks2 = [];
    const MIN_SPACING = 1e-14;
    const { bounds, step, min: min2, max: max2, precision, count, maxTicks, maxDigits, includeBounds } = generationOptions;
    const unit2 = step || 1;
    const maxSpaces = maxTicks - 1;
    const { min: rmin, max: rmax } = dataRange;
    const minDefined = !isNullOrUndef(min2);
    const maxDefined = !isNullOrUndef(max2);
    const countDefined = !isNullOrUndef(count);
    const minSpacing = (rmax - rmin) / (maxDigits + 1);
    let spacing = niceNum((rmax - rmin) / maxSpaces / unit2) * unit2;
    let factor, niceMin, niceMax, numSpaces;
    if (spacing < MIN_SPACING && !minDefined && !maxDefined) {
      return [
        {
          value: rmin
        },
        {
          value: rmax
        }
      ];
    }
    numSpaces = Math.ceil(rmax / spacing) - Math.floor(rmin / spacing);
    if (numSpaces > maxSpaces) {
      spacing = niceNum(numSpaces * spacing / maxSpaces / unit2) * unit2;
    }
    if (!isNullOrUndef(precision)) {
      factor = Math.pow(10, precision);
      spacing = Math.ceil(spacing * factor) / factor;
    }
    if (bounds === "ticks") {
      niceMin = Math.floor(rmin / spacing) * spacing;
      niceMax = Math.ceil(rmax / spacing) * spacing;
    } else {
      niceMin = rmin;
      niceMax = rmax;
    }
    if (minDefined && maxDefined && step && almostWhole((max2 - min2) / step, spacing / 1e3)) {
      numSpaces = Math.round(Math.min((max2 - min2) / spacing, maxTicks));
      spacing = (max2 - min2) / numSpaces;
      niceMin = min2;
      niceMax = max2;
    } else if (countDefined) {
      niceMin = minDefined ? min2 : niceMin;
      niceMax = maxDefined ? max2 : niceMax;
      numSpaces = count - 1;
      spacing = (niceMax - niceMin) / numSpaces;
    } else {
      numSpaces = (niceMax - niceMin) / spacing;
      if (almostEquals(numSpaces, Math.round(numSpaces), spacing / 1e3)) {
        numSpaces = Math.round(numSpaces);
      } else {
        numSpaces = Math.ceil(numSpaces);
      }
    }
    const decimalPlaces = Math.max(_decimalPlaces(spacing), _decimalPlaces(niceMin));
    factor = Math.pow(10, isNullOrUndef(precision) ? decimalPlaces : precision);
    niceMin = Math.round(niceMin * factor) / factor;
    niceMax = Math.round(niceMax * factor) / factor;
    let j = 0;
    if (minDefined) {
      if (includeBounds && niceMin !== min2) {
        ticks2.push({
          value: min2
        });
        if (niceMin < min2) {
          j++;
        }
        if (almostEquals(Math.round((niceMin + j * spacing) * factor) / factor, min2, relativeLabelSize(min2, minSpacing, generationOptions))) {
          j++;
        }
      } else if (niceMin < min2) {
        j++;
      }
    }
    for (; j < numSpaces; ++j) {
      ticks2.push({
        value: Math.round((niceMin + j * spacing) * factor) / factor
      });
    }
    if (maxDefined && includeBounds && niceMax !== max2) {
      if (ticks2.length && almostEquals(ticks2[ticks2.length - 1].value, max2, relativeLabelSize(max2, minSpacing, generationOptions))) {
        ticks2[ticks2.length - 1].value = max2;
      } else {
        ticks2.push({
          value: max2
        });
      }
    } else if (!maxDefined || niceMax === max2) {
      ticks2.push({
        value: niceMax
      });
    }
    return ticks2;
  }
  function relativeLabelSize(value, minSpacing, { horizontal, minRotation }) {
    const rad = toRadians(minRotation);
    const ratio = (horizontal ? Math.sin(rad) : Math.cos(rad)) || 1e-3;
    const length = 0.75 * minSpacing * ("" + value).length;
    return Math.min(minSpacing / ratio, length);
  }
  var LinearScaleBase = class extends Scale {
    constructor(cfg) {
      super(cfg);
      this.start = void 0;
      this.end = void 0;
      this._startValue = void 0;
      this._endValue = void 0;
      this._valueRange = 0;
    }
    parse(raw, index2) {
      if (isNullOrUndef(raw)) {
        return null;
      }
      if ((typeof raw === "number" || raw instanceof Number) && !isFinite(+raw)) {
        return null;
      }
      return +raw;
    }
    handleTickRangeOptions() {
      const { beginAtZero } = this.options;
      const { minDefined, maxDefined } = this.getUserBounds();
      let { min: min2, max: max2 } = this;
      const setMin = (v) => min2 = minDefined ? min2 : v;
      const setMax = (v) => max2 = maxDefined ? max2 : v;
      if (beginAtZero) {
        const minSign = sign(min2);
        const maxSign = sign(max2);
        if (minSign < 0 && maxSign < 0) {
          setMax(0);
        } else if (minSign > 0 && maxSign > 0) {
          setMin(0);
        }
      }
      if (min2 === max2) {
        let offset = max2 === 0 ? 1 : Math.abs(max2 * 0.05);
        setMax(max2 + offset);
        if (!beginAtZero) {
          setMin(min2 - offset);
        }
      }
      this.min = min2;
      this.max = max2;
    }
    getTickLimit() {
      const tickOpts = this.options.ticks;
      let { maxTicksLimit, stepSize } = tickOpts;
      let maxTicks;
      if (stepSize) {
        maxTicks = Math.ceil(this.max / stepSize) - Math.floor(this.min / stepSize) + 1;
        if (maxTicks > 1e3) {
          console.warn(`scales.${this.id}.ticks.stepSize: ${stepSize} would result generating up to ${maxTicks} ticks. Limiting to 1000.`);
          maxTicks = 1e3;
        }
      } else {
        maxTicks = this.computeTickLimit();
        maxTicksLimit = maxTicksLimit || 11;
      }
      if (maxTicksLimit) {
        maxTicks = Math.min(maxTicksLimit, maxTicks);
      }
      return maxTicks;
    }
    computeTickLimit() {
      return Number.POSITIVE_INFINITY;
    }
    buildTicks() {
      const opts = this.options;
      const tickOpts = opts.ticks;
      let maxTicks = this.getTickLimit();
      maxTicks = Math.max(2, maxTicks);
      const numericGeneratorOptions = {
        maxTicks,
        bounds: opts.bounds,
        min: opts.min,
        max: opts.max,
        precision: tickOpts.precision,
        step: tickOpts.stepSize,
        count: tickOpts.count,
        maxDigits: this._maxDigits(),
        horizontal: this.isHorizontal(),
        minRotation: tickOpts.minRotation || 0,
        includeBounds: tickOpts.includeBounds !== false
      };
      const dataRange = this._range || this;
      const ticks2 = generateTicks$1(numericGeneratorOptions, dataRange);
      if (opts.bounds === "ticks") {
        _setMinAndMaxByKey(ticks2, this, "value");
      }
      if (opts.reverse) {
        ticks2.reverse();
        this.start = this.max;
        this.end = this.min;
      } else {
        this.start = this.min;
        this.end = this.max;
      }
      return ticks2;
    }
    configure() {
      const ticks2 = this.ticks;
      let start2 = this.min;
      let end = this.max;
      super.configure();
      if (this.options.offset && ticks2.length) {
        const offset = (end - start2) / Math.max(ticks2.length - 1, 1) / 2;
        start2 -= offset;
        end += offset;
      }
      this._startValue = start2;
      this._endValue = end;
      this._valueRange = end - start2;
    }
    getLabelForValue(value) {
      return formatNumber(value, this.chart.options.locale, this.options.ticks.format);
    }
  };
  var LinearScale = class extends LinearScaleBase {
    determineDataLimits() {
      const { min: min2, max: max2 } = this.getMinMax(true);
      this.min = isNumberFinite(min2) ? min2 : 0;
      this.max = isNumberFinite(max2) ? max2 : 1;
      this.handleTickRangeOptions();
    }
    computeTickLimit() {
      const horizontal = this.isHorizontal();
      const length = horizontal ? this.width : this.height;
      const minRotation = toRadians(this.options.ticks.minRotation);
      const ratio = (horizontal ? Math.sin(minRotation) : Math.cos(minRotation)) || 1e-3;
      const tickFont = this._resolveTickFontOptions(0);
      return Math.ceil(length / Math.min(40, tickFont.lineHeight / ratio));
    }
    getPixelForValue(value) {
      return value === null ? NaN : this.getPixelForDecimal((value - this._startValue) / this._valueRange);
    }
    getValueForPixel(pixel) {
      return this._startValue + this.getDecimalForPixel(pixel) * this._valueRange;
    }
  };
  __publicField(LinearScale, "id", "linear");
  __publicField(LinearScale, "defaults", {
    ticks: {
      callback: Ticks.formatters.numeric
    }
  });
  var log10Floor = (v) => Math.floor(log10(v));
  var changeExponent = (v, m) => Math.pow(10, log10Floor(v) + m);
  function isMajor(tickVal) {
    const remain = tickVal / Math.pow(10, log10Floor(tickVal));
    return remain === 1;
  }
  function steps(min2, max2, rangeExp) {
    const rangeStep = Math.pow(10, rangeExp);
    const start2 = Math.floor(min2 / rangeStep);
    const end = Math.ceil(max2 / rangeStep);
    return end - start2;
  }
  function startExp(min2, max2) {
    const range = max2 - min2;
    let rangeExp = log10Floor(range);
    while (steps(min2, max2, rangeExp) > 10) {
      rangeExp++;
    }
    while (steps(min2, max2, rangeExp) < 10) {
      rangeExp--;
    }
    return Math.min(rangeExp, log10Floor(min2));
  }
  function generateTicks(generationOptions, { min: min2, max: max2 }) {
    min2 = finiteOrDefault(generationOptions.min, min2);
    const ticks2 = [];
    const minExp = log10Floor(min2);
    let exp = startExp(min2, max2);
    let precision = exp < 0 ? Math.pow(10, Math.abs(exp)) : 1;
    const stepSize = Math.pow(10, exp);
    const base = minExp > exp ? Math.pow(10, minExp) : 0;
    const start2 = Math.round((min2 - base) * precision) / precision;
    const offset = Math.floor((min2 - base) / stepSize / 10) * stepSize * 10;
    let significand = Math.floor((start2 - offset) / Math.pow(10, exp));
    let value = finiteOrDefault(generationOptions.min, Math.round((base + offset + significand * Math.pow(10, exp)) * precision) / precision);
    while (value < max2) {
      ticks2.push({
        value,
        major: isMajor(value),
        significand
      });
      if (significand >= 10) {
        significand = significand < 15 ? 15 : 20;
      } else {
        significand++;
      }
      if (significand >= 20) {
        exp++;
        significand = 2;
        precision = exp >= 0 ? 1 : precision;
      }
      value = Math.round((base + offset + significand * Math.pow(10, exp)) * precision) / precision;
    }
    const lastTick = finiteOrDefault(generationOptions.max, value);
    ticks2.push({
      value: lastTick,
      major: isMajor(lastTick),
      significand
    });
    return ticks2;
  }
  var LogarithmicScale = class extends Scale {
    constructor(cfg) {
      super(cfg);
      this.start = void 0;
      this.end = void 0;
      this._startValue = void 0;
      this._valueRange = 0;
    }
    parse(raw, index2) {
      const value = LinearScaleBase.prototype.parse.apply(this, [
        raw,
        index2
      ]);
      if (value === 0) {
        this._zero = true;
        return void 0;
      }
      return isNumberFinite(value) && value > 0 ? value : null;
    }
    determineDataLimits() {
      const { min: min2, max: max2 } = this.getMinMax(true);
      this.min = isNumberFinite(min2) ? Math.max(0, min2) : null;
      this.max = isNumberFinite(max2) ? Math.max(0, max2) : null;
      if (this.options.beginAtZero) {
        this._zero = true;
      }
      if (this._zero && this.min !== this._suggestedMin && !isNumberFinite(this._userMin)) {
        this.min = min2 === changeExponent(this.min, 0) ? changeExponent(this.min, -1) : changeExponent(this.min, 0);
      }
      this.handleTickRangeOptions();
    }
    handleTickRangeOptions() {
      const { minDefined, maxDefined } = this.getUserBounds();
      let min2 = this.min;
      let max2 = this.max;
      const setMin = (v) => min2 = minDefined ? min2 : v;
      const setMax = (v) => max2 = maxDefined ? max2 : v;
      if (min2 === max2) {
        if (min2 <= 0) {
          setMin(1);
          setMax(10);
        } else {
          setMin(changeExponent(min2, -1));
          setMax(changeExponent(max2, 1));
        }
      }
      if (min2 <= 0) {
        setMin(changeExponent(max2, -1));
      }
      if (max2 <= 0) {
        setMax(changeExponent(min2, 1));
      }
      this.min = min2;
      this.max = max2;
    }
    buildTicks() {
      const opts = this.options;
      const generationOptions = {
        min: this._userMin,
        max: this._userMax
      };
      const ticks2 = generateTicks(generationOptions, this);
      if (opts.bounds === "ticks") {
        _setMinAndMaxByKey(ticks2, this, "value");
      }
      if (opts.reverse) {
        ticks2.reverse();
        this.start = this.max;
        this.end = this.min;
      } else {
        this.start = this.min;
        this.end = this.max;
      }
      return ticks2;
    }
    getLabelForValue(value) {
      return value === void 0 ? "0" : formatNumber(value, this.chart.options.locale, this.options.ticks.format);
    }
    configure() {
      const start2 = this.min;
      super.configure();
      this._startValue = log10(start2);
      this._valueRange = log10(this.max) - log10(start2);
    }
    getPixelForValue(value) {
      if (value === void 0 || value === 0) {
        value = this.min;
      }
      if (value === null || isNaN(value)) {
        return NaN;
      }
      return this.getPixelForDecimal(value === this.min ? 0 : (log10(value) - this._startValue) / this._valueRange);
    }
    getValueForPixel(pixel) {
      const decimal = this.getDecimalForPixel(pixel);
      return Math.pow(10, this._startValue + decimal * this._valueRange);
    }
  };
  __publicField(LogarithmicScale, "id", "logarithmic");
  __publicField(LogarithmicScale, "defaults", {
    ticks: {
      callback: Ticks.formatters.logarithmic,
      major: {
        enabled: true
      }
    }
  });
  function getTickBackdropHeight(opts) {
    const tickOpts = opts.ticks;
    if (tickOpts.display && opts.display) {
      const padding = toPadding(tickOpts.backdropPadding);
      return valueOrDefault(tickOpts.font && tickOpts.font.size, defaults.font.size) + padding.height;
    }
    return 0;
  }
  function measureLabelSize(ctx, font, label) {
    label = isArray(label) ? label : [
      label
    ];
    return {
      w: _longestText(ctx, font.string, label),
      h: label.length * font.lineHeight
    };
  }
  function determineLimits(angle, pos, size, min2, max2) {
    if (angle === min2 || angle === max2) {
      return {
        start: pos - size / 2,
        end: pos + size / 2
      };
    } else if (angle < min2 || angle > max2) {
      return {
        start: pos - size,
        end: pos
      };
    }
    return {
      start: pos,
      end: pos + size
    };
  }
  function fitWithPointLabels(scale) {
    const orig = {
      l: scale.left + scale._padding.left,
      r: scale.right - scale._padding.right,
      t: scale.top + scale._padding.top,
      b: scale.bottom - scale._padding.bottom
    };
    const limits = Object.assign({}, orig);
    const labelSizes = [];
    const padding = [];
    const valueCount = scale._pointLabels.length;
    const pointLabelOpts = scale.options.pointLabels;
    const additionalAngle = pointLabelOpts.centerPointLabels ? PI / valueCount : 0;
    for (let i = 0; i < valueCount; i++) {
      const opts = pointLabelOpts.setContext(scale.getPointLabelContext(i));
      padding[i] = opts.padding;
      const pointPosition = scale.getPointPosition(i, scale.drawingArea + padding[i], additionalAngle);
      const plFont = toFont(opts.font);
      const textSize = measureLabelSize(scale.ctx, plFont, scale._pointLabels[i]);
      labelSizes[i] = textSize;
      const angleRadians = _normalizeAngle(scale.getIndexAngle(i) + additionalAngle);
      const angle = Math.round(toDegrees(angleRadians));
      const hLimits = determineLimits(angle, pointPosition.x, textSize.w, 0, 180);
      const vLimits = determineLimits(angle, pointPosition.y, textSize.h, 90, 270);
      updateLimits(limits, orig, angleRadians, hLimits, vLimits);
    }
    scale.setCenterPoint(orig.l - limits.l, limits.r - orig.r, orig.t - limits.t, limits.b - orig.b);
    scale._pointLabelItems = buildPointLabelItems(scale, labelSizes, padding);
  }
  function updateLimits(limits, orig, angle, hLimits, vLimits) {
    const sin = Math.abs(Math.sin(angle));
    const cos = Math.abs(Math.cos(angle));
    let x = 0;
    let y = 0;
    if (hLimits.start < orig.l) {
      x = (orig.l - hLimits.start) / sin;
      limits.l = Math.min(limits.l, orig.l - x);
    } else if (hLimits.end > orig.r) {
      x = (hLimits.end - orig.r) / sin;
      limits.r = Math.max(limits.r, orig.r + x);
    }
    if (vLimits.start < orig.t) {
      y = (orig.t - vLimits.start) / cos;
      limits.t = Math.min(limits.t, orig.t - y);
    } else if (vLimits.end > orig.b) {
      y = (vLimits.end - orig.b) / cos;
      limits.b = Math.max(limits.b, orig.b + y);
    }
  }
  function buildPointLabelItems(scale, labelSizes, padding) {
    const items = [];
    const valueCount = scale._pointLabels.length;
    const opts = scale.options;
    const extra = getTickBackdropHeight(opts) / 2;
    const outerDistance = scale.drawingArea;
    const additionalAngle = opts.pointLabels.centerPointLabels ? PI / valueCount : 0;
    for (let i = 0; i < valueCount; i++) {
      const pointLabelPosition = scale.getPointPosition(i, outerDistance + extra + padding[i], additionalAngle);
      const angle = Math.round(toDegrees(_normalizeAngle(pointLabelPosition.angle + HALF_PI)));
      const size = labelSizes[i];
      const y = yForAngle(pointLabelPosition.y, size.h, angle);
      const textAlign = getTextAlignForAngle(angle);
      const left = leftForTextAlign(pointLabelPosition.x, size.w, textAlign);
      items.push({
        x: pointLabelPosition.x,
        y,
        textAlign,
        left,
        top: y,
        right: left + size.w,
        bottom: y + size.h
      });
    }
    return items;
  }
  function getTextAlignForAngle(angle) {
    if (angle === 0 || angle === 180) {
      return "center";
    } else if (angle < 180) {
      return "left";
    }
    return "right";
  }
  function leftForTextAlign(x, w, align) {
    if (align === "right") {
      x -= w;
    } else if (align === "center") {
      x -= w / 2;
    }
    return x;
  }
  function yForAngle(y, h, angle) {
    if (angle === 90 || angle === 270) {
      y -= h / 2;
    } else if (angle > 270 || angle < 90) {
      y -= h;
    }
    return y;
  }
  function drawPointLabels(scale, labelCount) {
    const { ctx, options: { pointLabels } } = scale;
    for (let i = labelCount - 1; i >= 0; i--) {
      const optsAtIndex = pointLabels.setContext(scale.getPointLabelContext(i));
      const plFont = toFont(optsAtIndex.font);
      const { x, y, textAlign, left, top, right, bottom } = scale._pointLabelItems[i];
      const { backdropColor } = optsAtIndex;
      if (!isNullOrUndef(backdropColor)) {
        const borderRadius = toTRBLCorners(optsAtIndex.borderRadius);
        const padding = toPadding(optsAtIndex.backdropPadding);
        ctx.fillStyle = backdropColor;
        const backdropLeft = left - padding.left;
        const backdropTop = top - padding.top;
        const backdropWidth = right - left + padding.width;
        const backdropHeight = bottom - top + padding.height;
        if (Object.values(borderRadius).some((v) => v !== 0)) {
          ctx.beginPath();
          addRoundedRectPath(ctx, {
            x: backdropLeft,
            y: backdropTop,
            w: backdropWidth,
            h: backdropHeight,
            radius: borderRadius
          });
          ctx.fill();
        } else {
          ctx.fillRect(backdropLeft, backdropTop, backdropWidth, backdropHeight);
        }
      }
      renderText(ctx, scale._pointLabels[i], x, y + plFont.lineHeight / 2, plFont, {
        color: optsAtIndex.color,
        textAlign,
        textBaseline: "middle"
      });
    }
  }
  function pathRadiusLine(scale, radius, circular, labelCount) {
    const { ctx } = scale;
    if (circular) {
      ctx.arc(scale.xCenter, scale.yCenter, radius, 0, TAU);
    } else {
      let pointPosition = scale.getPointPosition(0, radius);
      ctx.moveTo(pointPosition.x, pointPosition.y);
      for (let i = 1; i < labelCount; i++) {
        pointPosition = scale.getPointPosition(i, radius);
        ctx.lineTo(pointPosition.x, pointPosition.y);
      }
    }
  }
  function drawRadiusLine(scale, gridLineOpts, radius, labelCount, borderOpts) {
    const ctx = scale.ctx;
    const circular = gridLineOpts.circular;
    const { color: color3, lineWidth } = gridLineOpts;
    if (!circular && !labelCount || !color3 || !lineWidth || radius < 0) {
      return;
    }
    ctx.save();
    ctx.strokeStyle = color3;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(borderOpts.dash);
    ctx.lineDashOffset = borderOpts.dashOffset;
    ctx.beginPath();
    pathRadiusLine(scale, radius, circular, labelCount);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  function createPointLabelContext(parent, index2, label) {
    return createContext(parent, {
      label,
      index: index2,
      type: "pointLabel"
    });
  }
  var RadialLinearScale = class extends LinearScaleBase {
    constructor(cfg) {
      super(cfg);
      this.xCenter = void 0;
      this.yCenter = void 0;
      this.drawingArea = void 0;
      this._pointLabels = [];
      this._pointLabelItems = [];
    }
    setDimensions() {
      const padding = this._padding = toPadding(getTickBackdropHeight(this.options) / 2);
      const w = this.width = this.maxWidth - padding.width;
      const h = this.height = this.maxHeight - padding.height;
      this.xCenter = Math.floor(this.left + w / 2 + padding.left);
      this.yCenter = Math.floor(this.top + h / 2 + padding.top);
      this.drawingArea = Math.floor(Math.min(w, h) / 2);
    }
    determineDataLimits() {
      const { min: min2, max: max2 } = this.getMinMax(false);
      this.min = isNumberFinite(min2) && !isNaN(min2) ? min2 : 0;
      this.max = isNumberFinite(max2) && !isNaN(max2) ? max2 : 0;
      this.handleTickRangeOptions();
    }
    computeTickLimit() {
      return Math.ceil(this.drawingArea / getTickBackdropHeight(this.options));
    }
    generateTickLabels(ticks2) {
      LinearScaleBase.prototype.generateTickLabels.call(this, ticks2);
      this._pointLabels = this.getLabels().map((value, index2) => {
        const label = callback(this.options.pointLabels.callback, [
          value,
          index2
        ], this);
        return label || label === 0 ? label : "";
      }).filter((v, i) => this.chart.getDataVisibility(i));
    }
    fit() {
      const opts = this.options;
      if (opts.display && opts.pointLabels.display) {
        fitWithPointLabels(this);
      } else {
        this.setCenterPoint(0, 0, 0, 0);
      }
    }
    setCenterPoint(leftMovement, rightMovement, topMovement, bottomMovement) {
      this.xCenter += Math.floor((leftMovement - rightMovement) / 2);
      this.yCenter += Math.floor((topMovement - bottomMovement) / 2);
      this.drawingArea -= Math.min(this.drawingArea / 2, Math.max(leftMovement, rightMovement, topMovement, bottomMovement));
    }
    getIndexAngle(index2) {
      const angleMultiplier = TAU / (this._pointLabels.length || 1);
      const startAngle = this.options.startAngle || 0;
      return _normalizeAngle(index2 * angleMultiplier + toRadians(startAngle));
    }
    getDistanceFromCenterForValue(value) {
      if (isNullOrUndef(value)) {
        return NaN;
      }
      const scalingFactor = this.drawingArea / (this.max - this.min);
      if (this.options.reverse) {
        return (this.max - value) * scalingFactor;
      }
      return (value - this.min) * scalingFactor;
    }
    getValueForDistanceFromCenter(distance) {
      if (isNullOrUndef(distance)) {
        return NaN;
      }
      const scaledDistance = distance / (this.drawingArea / (this.max - this.min));
      return this.options.reverse ? this.max - scaledDistance : this.min + scaledDistance;
    }
    getPointLabelContext(index2) {
      const pointLabels = this._pointLabels || [];
      if (index2 >= 0 && index2 < pointLabels.length) {
        const pointLabel = pointLabels[index2];
        return createPointLabelContext(this.getContext(), index2, pointLabel);
      }
    }
    getPointPosition(index2, distanceFromCenter, additionalAngle = 0) {
      const angle = this.getIndexAngle(index2) - HALF_PI + additionalAngle;
      return {
        x: Math.cos(angle) * distanceFromCenter + this.xCenter,
        y: Math.sin(angle) * distanceFromCenter + this.yCenter,
        angle
      };
    }
    getPointPositionForValue(index2, value) {
      return this.getPointPosition(index2, this.getDistanceFromCenterForValue(value));
    }
    getBasePosition(index2) {
      return this.getPointPositionForValue(index2 || 0, this.getBaseValue());
    }
    getPointLabelPosition(index2) {
      const { left, top, right, bottom } = this._pointLabelItems[index2];
      return {
        left,
        top,
        right,
        bottom
      };
    }
    drawBackground() {
      const { backgroundColor, grid: { circular } } = this.options;
      if (backgroundColor) {
        const ctx = this.ctx;
        ctx.save();
        ctx.beginPath();
        pathRadiusLine(this, this.getDistanceFromCenterForValue(this._endValue), circular, this._pointLabels.length);
        ctx.closePath();
        ctx.fillStyle = backgroundColor;
        ctx.fill();
        ctx.restore();
      }
    }
    drawGrid() {
      const ctx = this.ctx;
      const opts = this.options;
      const { angleLines, grid, border } = opts;
      const labelCount = this._pointLabels.length;
      let i, offset, position;
      if (opts.pointLabels.display) {
        drawPointLabels(this, labelCount);
      }
      if (grid.display) {
        this.ticks.forEach((tick, index2) => {
          if (index2 !== 0) {
            offset = this.getDistanceFromCenterForValue(tick.value);
            const context = this.getContext(index2);
            const optsAtIndex = grid.setContext(context);
            const optsAtIndexBorder = border.setContext(context);
            drawRadiusLine(this, optsAtIndex, offset, labelCount, optsAtIndexBorder);
          }
        });
      }
      if (angleLines.display) {
        ctx.save();
        for (i = labelCount - 1; i >= 0; i--) {
          const optsAtIndex = angleLines.setContext(this.getPointLabelContext(i));
          const { color: color3, lineWidth } = optsAtIndex;
          if (!lineWidth || !color3) {
            continue;
          }
          ctx.lineWidth = lineWidth;
          ctx.strokeStyle = color3;
          ctx.setLineDash(optsAtIndex.borderDash);
          ctx.lineDashOffset = optsAtIndex.borderDashOffset;
          offset = this.getDistanceFromCenterForValue(opts.ticks.reverse ? this.min : this.max);
          position = this.getPointPosition(i, offset);
          ctx.beginPath();
          ctx.moveTo(this.xCenter, this.yCenter);
          ctx.lineTo(position.x, position.y);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    drawBorder() {
    }
    drawLabels() {
      const ctx = this.ctx;
      const opts = this.options;
      const tickOpts = opts.ticks;
      if (!tickOpts.display) {
        return;
      }
      const startAngle = this.getIndexAngle(0);
      let offset, width;
      ctx.save();
      ctx.translate(this.xCenter, this.yCenter);
      ctx.rotate(startAngle);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      this.ticks.forEach((tick, index2) => {
        if (index2 === 0 && !opts.reverse) {
          return;
        }
        const optsAtIndex = tickOpts.setContext(this.getContext(index2));
        const tickFont = toFont(optsAtIndex.font);
        offset = this.getDistanceFromCenterForValue(this.ticks[index2].value);
        if (optsAtIndex.showLabelBackdrop) {
          ctx.font = tickFont.string;
          width = ctx.measureText(tick.label).width;
          ctx.fillStyle = optsAtIndex.backdropColor;
          const padding = toPadding(optsAtIndex.backdropPadding);
          ctx.fillRect(-width / 2 - padding.left, -offset - tickFont.size / 2 - padding.top, width + padding.width, tickFont.size + padding.height);
        }
        renderText(ctx, tick.label, 0, -offset, tickFont, {
          color: optsAtIndex.color
        });
      });
      ctx.restore();
    }
    drawTitle() {
    }
  };
  __publicField(RadialLinearScale, "id", "radialLinear");
  __publicField(RadialLinearScale, "defaults", {
    display: true,
    animate: true,
    position: "chartArea",
    angleLines: {
      display: true,
      lineWidth: 1,
      borderDash: [],
      borderDashOffset: 0
    },
    grid: {
      circular: false
    },
    startAngle: 0,
    ticks: {
      showLabelBackdrop: true,
      callback: Ticks.formatters.numeric
    },
    pointLabels: {
      backdropColor: void 0,
      backdropPadding: 2,
      display: true,
      font: {
        size: 10
      },
      callback(label) {
        return label;
      },
      padding: 5,
      centerPointLabels: false
    }
  });
  __publicField(RadialLinearScale, "defaultRoutes", {
    "angleLines.color": "borderColor",
    "pointLabels.color": "color",
    "ticks.color": "color"
  });
  __publicField(RadialLinearScale, "descriptors", {
    angleLines: {
      _fallback: "grid"
    }
  });
  var INTERVALS = {
    millisecond: {
      common: true,
      size: 1,
      steps: 1e3
    },
    second: {
      common: true,
      size: 1e3,
      steps: 60
    },
    minute: {
      common: true,
      size: 6e4,
      steps: 60
    },
    hour: {
      common: true,
      size: 36e5,
      steps: 24
    },
    day: {
      common: true,
      size: 864e5,
      steps: 30
    },
    week: {
      common: false,
      size: 6048e5,
      steps: 4
    },
    month: {
      common: true,
      size: 2628e6,
      steps: 12
    },
    quarter: {
      common: false,
      size: 7884e6,
      steps: 4
    },
    year: {
      common: true,
      size: 3154e7
    }
  };
  var UNITS = /* @__PURE__ */ Object.keys(INTERVALS);
  function sorter(a, b) {
    return a - b;
  }
  function parse(scale, input) {
    if (isNullOrUndef(input)) {
      return null;
    }
    const adapter = scale._adapter;
    const { parser, round: round2, isoWeekday } = scale._parseOpts;
    let value = input;
    if (typeof parser === "function") {
      value = parser(value);
    }
    if (!isNumberFinite(value)) {
      value = typeof parser === "string" ? adapter.parse(value, parser) : adapter.parse(value);
    }
    if (value === null) {
      return null;
    }
    if (round2) {
      value = round2 === "week" && (isNumber(isoWeekday) || isoWeekday === true) ? adapter.startOf(value, "isoWeek", isoWeekday) : adapter.startOf(value, round2);
    }
    return +value;
  }
  function determineUnitForAutoTicks(minUnit, min2, max2, capacity) {
    const ilen = UNITS.length;
    for (let i = UNITS.indexOf(minUnit); i < ilen - 1; ++i) {
      const interval2 = INTERVALS[UNITS[i]];
      const factor = interval2.steps ? interval2.steps : Number.MAX_SAFE_INTEGER;
      if (interval2.common && Math.ceil((max2 - min2) / (factor * interval2.size)) <= capacity) {
        return UNITS[i];
      }
    }
    return UNITS[ilen - 1];
  }
  function determineUnitForFormatting(scale, numTicks, minUnit, min2, max2) {
    for (let i = UNITS.length - 1; i >= UNITS.indexOf(minUnit); i--) {
      const unit2 = UNITS[i];
      if (INTERVALS[unit2].common && scale._adapter.diff(max2, min2, unit2) >= numTicks - 1) {
        return unit2;
      }
    }
    return UNITS[minUnit ? UNITS.indexOf(minUnit) : 0];
  }
  function determineMajorUnit(unit2) {
    for (let i = UNITS.indexOf(unit2) + 1, ilen = UNITS.length; i < ilen; ++i) {
      if (INTERVALS[UNITS[i]].common) {
        return UNITS[i];
      }
    }
  }
  function addTick(ticks2, time, timestamps) {
    if (!timestamps) {
      ticks2[time] = true;
    } else if (timestamps.length) {
      const { lo, hi } = _lookup(timestamps, time);
      const timestamp = timestamps[lo] >= time ? timestamps[lo] : timestamps[hi];
      ticks2[timestamp] = true;
    }
  }
  function setMajorTicks(scale, ticks2, map4, majorUnit) {
    const adapter = scale._adapter;
    const first = +adapter.startOf(ticks2[0].value, majorUnit);
    const last = ticks2[ticks2.length - 1].value;
    let major, index2;
    for (major = first; major <= last; major = +adapter.add(major, 1, majorUnit)) {
      index2 = map4[major];
      if (index2 >= 0) {
        ticks2[index2].major = true;
      }
    }
    return ticks2;
  }
  function ticksFromTimestamps(scale, values, majorUnit) {
    const ticks2 = [];
    const map4 = {};
    const ilen = values.length;
    let i, value;
    for (i = 0; i < ilen; ++i) {
      value = values[i];
      map4[value] = i;
      ticks2.push({
        value,
        major: false
      });
    }
    return ilen === 0 || !majorUnit ? ticks2 : setMajorTicks(scale, ticks2, map4, majorUnit);
  }
  var TimeScale = class extends Scale {
    constructor(props) {
      super(props);
      this._cache = {
        data: [],
        labels: [],
        all: []
      };
      this._unit = "day";
      this._majorUnit = void 0;
      this._offsets = {};
      this._normalized = false;
      this._parseOpts = void 0;
    }
    init(scaleOpts, opts = {}) {
      const time = scaleOpts.time || (scaleOpts.time = {});
      const adapter = this._adapter = new adapters._date(scaleOpts.adapters.date);
      adapter.init(opts);
      mergeIf(time.displayFormats, adapter.formats());
      this._parseOpts = {
        parser: time.parser,
        round: time.round,
        isoWeekday: time.isoWeekday
      };
      super.init(scaleOpts);
      this._normalized = opts.normalized;
    }
    parse(raw, index2) {
      if (raw === void 0) {
        return null;
      }
      return parse(this, raw);
    }
    beforeLayout() {
      super.beforeLayout();
      this._cache = {
        data: [],
        labels: [],
        all: []
      };
    }
    determineDataLimits() {
      const options = this.options;
      const adapter = this._adapter;
      const unit2 = options.time.unit || "day";
      let { min: min2, max: max2, minDefined, maxDefined } = this.getUserBounds();
      function _applyBounds(bounds) {
        if (!minDefined && !isNaN(bounds.min)) {
          min2 = Math.min(min2, bounds.min);
        }
        if (!maxDefined && !isNaN(bounds.max)) {
          max2 = Math.max(max2, bounds.max);
        }
      }
      if (!minDefined || !maxDefined) {
        _applyBounds(this._getLabelBounds());
        if (options.bounds !== "ticks" || options.ticks.source !== "labels") {
          _applyBounds(this.getMinMax(false));
        }
      }
      min2 = isNumberFinite(min2) && !isNaN(min2) ? min2 : +adapter.startOf(Date.now(), unit2);
      max2 = isNumberFinite(max2) && !isNaN(max2) ? max2 : +adapter.endOf(Date.now(), unit2) + 1;
      this.min = Math.min(min2, max2 - 1);
      this.max = Math.max(min2 + 1, max2);
    }
    _getLabelBounds() {
      const arr = this.getLabelTimestamps();
      let min2 = Number.POSITIVE_INFINITY;
      let max2 = Number.NEGATIVE_INFINITY;
      if (arr.length) {
        min2 = arr[0];
        max2 = arr[arr.length - 1];
      }
      return {
        min: min2,
        max: max2
      };
    }
    buildTicks() {
      const options = this.options;
      const timeOpts = options.time;
      const tickOpts = options.ticks;
      const timestamps = tickOpts.source === "labels" ? this.getLabelTimestamps() : this._generate();
      if (options.bounds === "ticks" && timestamps.length) {
        this.min = this._userMin || timestamps[0];
        this.max = this._userMax || timestamps[timestamps.length - 1];
      }
      const min2 = this.min;
      const max2 = this.max;
      const ticks2 = _filterBetween(timestamps, min2, max2);
      this._unit = timeOpts.unit || (tickOpts.autoSkip ? determineUnitForAutoTicks(timeOpts.minUnit, this.min, this.max, this._getLabelCapacity(min2)) : determineUnitForFormatting(this, ticks2.length, timeOpts.minUnit, this.min, this.max));
      this._majorUnit = !tickOpts.major.enabled || this._unit === "year" ? void 0 : determineMajorUnit(this._unit);
      this.initOffsets(timestamps);
      if (options.reverse) {
        ticks2.reverse();
      }
      return ticksFromTimestamps(this, ticks2, this._majorUnit);
    }
    afterAutoSkip() {
      if (this.options.offsetAfterAutoskip) {
        this.initOffsets(this.ticks.map((tick) => +tick.value));
      }
    }
    initOffsets(timestamps = []) {
      let start2 = 0;
      let end = 0;
      let first, last;
      if (this.options.offset && timestamps.length) {
        first = this.getDecimalForValue(timestamps[0]);
        if (timestamps.length === 1) {
          start2 = 1 - first;
        } else {
          start2 = (this.getDecimalForValue(timestamps[1]) - first) / 2;
        }
        last = this.getDecimalForValue(timestamps[timestamps.length - 1]);
        if (timestamps.length === 1) {
          end = last;
        } else {
          end = (last - this.getDecimalForValue(timestamps[timestamps.length - 2])) / 2;
        }
      }
      const limit = timestamps.length < 3 ? 0.5 : 0.25;
      start2 = _limitValue(start2, 0, limit);
      end = _limitValue(end, 0, limit);
      this._offsets = {
        start: start2,
        end,
        factor: 1 / (start2 + 1 + end)
      };
    }
    _generate() {
      const adapter = this._adapter;
      const min2 = this.min;
      const max2 = this.max;
      const options = this.options;
      const timeOpts = options.time;
      const minor = timeOpts.unit || determineUnitForAutoTicks(timeOpts.minUnit, min2, max2, this._getLabelCapacity(min2));
      const stepSize = valueOrDefault(options.ticks.stepSize, 1);
      const weekday = minor === "week" ? timeOpts.isoWeekday : false;
      const hasWeekday = isNumber(weekday) || weekday === true;
      const ticks2 = {};
      let first = min2;
      let time, count;
      if (hasWeekday) {
        first = +adapter.startOf(first, "isoWeek", weekday);
      }
      first = +adapter.startOf(first, hasWeekday ? "day" : minor);
      if (adapter.diff(max2, min2, minor) > 1e5 * stepSize) {
        throw new Error(min2 + " and " + max2 + " are too far apart with stepSize of " + stepSize + " " + minor);
      }
      const timestamps = options.ticks.source === "data" && this.getDataTimestamps();
      for (time = first, count = 0; time < max2; time = +adapter.add(time, stepSize, minor), count++) {
        addTick(ticks2, time, timestamps);
      }
      if (time === max2 || options.bounds === "ticks" || count === 1) {
        addTick(ticks2, time, timestamps);
      }
      return Object.keys(ticks2).sort((a, b) => a - b).map((x) => +x);
    }
    getLabelForValue(value) {
      const adapter = this._adapter;
      const timeOpts = this.options.time;
      if (timeOpts.tooltipFormat) {
        return adapter.format(value, timeOpts.tooltipFormat);
      }
      return adapter.format(value, timeOpts.displayFormats.datetime);
    }
    format(value, format2) {
      const options = this.options;
      const formats = options.time.displayFormats;
      const unit2 = this._unit;
      const fmt = format2 || formats[unit2];
      return this._adapter.format(value, fmt);
    }
    _tickFormatFunction(time, index2, ticks2, format2) {
      const options = this.options;
      const formatter = options.ticks.callback;
      if (formatter) {
        return callback(formatter, [
          time,
          index2,
          ticks2
        ], this);
      }
      const formats = options.time.displayFormats;
      const unit2 = this._unit;
      const majorUnit = this._majorUnit;
      const minorFormat = unit2 && formats[unit2];
      const majorFormat = majorUnit && formats[majorUnit];
      const tick = ticks2[index2];
      const major = majorUnit && majorFormat && tick && tick.major;
      return this._adapter.format(time, format2 || (major ? majorFormat : minorFormat));
    }
    generateTickLabels(ticks2) {
      let i, ilen, tick;
      for (i = 0, ilen = ticks2.length; i < ilen; ++i) {
        tick = ticks2[i];
        tick.label = this._tickFormatFunction(tick.value, i, ticks2);
      }
    }
    getDecimalForValue(value) {
      return value === null ? NaN : (value - this.min) / (this.max - this.min);
    }
    getPixelForValue(value) {
      const offsets = this._offsets;
      const pos = this.getDecimalForValue(value);
      return this.getPixelForDecimal((offsets.start + pos) * offsets.factor);
    }
    getValueForPixel(pixel) {
      const offsets = this._offsets;
      const pos = this.getDecimalForPixel(pixel) / offsets.factor - offsets.end;
      return this.min + pos * (this.max - this.min);
    }
    _getLabelSize(label) {
      const ticksOpts = this.options.ticks;
      const tickLabelWidth = this.ctx.measureText(label).width;
      const angle = toRadians(this.isHorizontal() ? ticksOpts.maxRotation : ticksOpts.minRotation);
      const cosRotation = Math.cos(angle);
      const sinRotation = Math.sin(angle);
      const tickFontSize = this._resolveTickFontOptions(0).size;
      return {
        w: tickLabelWidth * cosRotation + tickFontSize * sinRotation,
        h: tickLabelWidth * sinRotation + tickFontSize * cosRotation
      };
    }
    _getLabelCapacity(exampleTime) {
      const timeOpts = this.options.time;
      const displayFormats = timeOpts.displayFormats;
      const format2 = displayFormats[timeOpts.unit] || displayFormats.millisecond;
      const exampleLabel = this._tickFormatFunction(exampleTime, 0, ticksFromTimestamps(this, [
        exampleTime
      ], this._majorUnit), format2);
      const size = this._getLabelSize(exampleLabel);
      const capacity = Math.floor(this.isHorizontal() ? this.width / size.w : this.height / size.h) - 1;
      return capacity > 0 ? capacity : 1;
    }
    getDataTimestamps() {
      let timestamps = this._cache.data || [];
      let i, ilen;
      if (timestamps.length) {
        return timestamps;
      }
      const metas = this.getMatchingVisibleMetas();
      if (this._normalized && metas.length) {
        return this._cache.data = metas[0].controller.getAllParsedValues(this);
      }
      for (i = 0, ilen = metas.length; i < ilen; ++i) {
        timestamps = timestamps.concat(metas[i].controller.getAllParsedValues(this));
      }
      return this._cache.data = this.normalize(timestamps);
    }
    getLabelTimestamps() {
      const timestamps = this._cache.labels || [];
      let i, ilen;
      if (timestamps.length) {
        return timestamps;
      }
      const labels = this.getLabels();
      for (i = 0, ilen = labels.length; i < ilen; ++i) {
        timestamps.push(parse(this, labels[i]));
      }
      return this._cache.labels = this._normalized ? timestamps : this.normalize(timestamps);
    }
    normalize(values) {
      return _arrayUnique(values.sort(sorter));
    }
  };
  __publicField(TimeScale, "id", "time");
  __publicField(TimeScale, "defaults", {
    bounds: "data",
    adapters: {},
    time: {
      parser: false,
      unit: false,
      round: false,
      isoWeekday: false,
      minUnit: "millisecond",
      displayFormats: {}
    },
    ticks: {
      source: "auto",
      callback: false,
      major: {
        enabled: false
      }
    }
  });
  function interpolate2(table, val, reverse) {
    let lo = 0;
    let hi = table.length - 1;
    let prevSource, nextSource, prevTarget, nextTarget;
    if (reverse) {
      if (val >= table[lo].pos && val <= table[hi].pos) {
        ({ lo, hi } = _lookupByKey(table, "pos", val));
      }
      ({ pos: prevSource, time: prevTarget } = table[lo]);
      ({ pos: nextSource, time: nextTarget } = table[hi]);
    } else {
      if (val >= table[lo].time && val <= table[hi].time) {
        ({ lo, hi } = _lookupByKey(table, "time", val));
      }
      ({ time: prevSource, pos: prevTarget } = table[lo]);
      ({ time: nextSource, pos: nextTarget } = table[hi]);
    }
    const span = nextSource - prevSource;
    return span ? prevTarget + (nextTarget - prevTarget) * (val - prevSource) / span : prevTarget;
  }
  var TimeSeriesScale = class extends TimeScale {
    constructor(props) {
      super(props);
      this._table = [];
      this._minPos = void 0;
      this._tableRange = void 0;
    }
    initOffsets() {
      const timestamps = this._getTimestampsForTable();
      const table = this._table = this.buildLookupTable(timestamps);
      this._minPos = interpolate2(table, this.min);
      this._tableRange = interpolate2(table, this.max) - this._minPos;
      super.initOffsets(timestamps);
    }
    buildLookupTable(timestamps) {
      const { min: min2, max: max2 } = this;
      const items = [];
      const table = [];
      let i, ilen, prev, curr, next;
      for (i = 0, ilen = timestamps.length; i < ilen; ++i) {
        curr = timestamps[i];
        if (curr >= min2 && curr <= max2) {
          items.push(curr);
        }
      }
      if (items.length < 2) {
        return [
          {
            time: min2,
            pos: 0
          },
          {
            time: max2,
            pos: 1
          }
        ];
      }
      for (i = 0, ilen = items.length; i < ilen; ++i) {
        next = items[i + 1];
        prev = items[i - 1];
        curr = items[i];
        if (Math.round((next + prev) / 2) !== curr) {
          table.push({
            time: curr,
            pos: i / (ilen - 1)
          });
        }
      }
      return table;
    }
    _getTimestampsForTable() {
      let timestamps = this._cache.all || [];
      if (timestamps.length) {
        return timestamps;
      }
      const data = this.getDataTimestamps();
      const label = this.getLabelTimestamps();
      if (data.length && label.length) {
        timestamps = this.normalize(data.concat(label));
      } else {
        timestamps = data.length ? data : label;
      }
      timestamps = this._cache.all = timestamps;
      return timestamps;
    }
    getDecimalForValue(value) {
      return (interpolate2(this._table, value) - this._minPos) / this._tableRange;
    }
    getValueForPixel(pixel) {
      const offsets = this._offsets;
      const decimal = this.getDecimalForPixel(pixel) / offsets.factor - offsets.end;
      return interpolate2(this._table, decimal * this._tableRange + this._minPos, true);
    }
  };
  __publicField(TimeSeriesScale, "id", "timeseries");
  __publicField(TimeSeriesScale, "defaults", TimeScale.defaults);
  var scales = /* @__PURE__ */ Object.freeze({
    __proto__: null,
    CategoryScale,
    LinearScale,
    LogarithmicScale,
    RadialLinearScale,
    TimeScale,
    TimeSeriesScale
  });
  var registerables = [
    controllers,
    elements,
    plugins,
    scales
  ];

  // node_modules/chart.js/auto/auto.js
  Chart.register(...registerables);
  var auto_default = Chart;

  // src/modelgui.ts
  var getCircularReplacer = () => {
    const seen = /* @__PURE__ */ new WeakSet();
    return (key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return;
        }
        seen.add(value);
      }
      return value;
    };
  };
  var sizeFoodServing = 50;
  var distanceBetweenPeople = 30;
  var SERVING_TIME = 0.5;
  console.log("You are reading me now");
  var isPlaying = false;
  function updateGUI(gui) {
    for (let i = 0; i < gui.model.foodStations.length; i++) {
      gui.tableIndices.set(gui.model.foodStations[i], i + 1);
    }
    for (let i = 0; i < gui.model.allTables.length; i++) {
      gui.tableIndices.set(gui.model.allTables[i], i + 1 + gui.model.foodStations.length);
    }
    function getTableIndex(d) {
      return gui.tableIndices.get(d) ?? 0;
    }
    gui.horizontalScaleMap = linear2().domain([0, 1 + gui.model.foodStations.length + gui.model.allTables.length]).range([100, 800]);
    const foodStationRects = gui.containerSVG.selectAll(".food-station").data(gui.model.foodStations).join("rect").attr("class", "food-station").attr("width", 50).attr("height", 50).attr("x", function(d) {
      return gui.horizontalScaleMap(getTableIndex(d));
    }).attr("y", 50).attr("fill", "red");
    const tableCircles = gui.containerSVG.selectAll(".table").data(gui.model.allTables).join("circle").attr("class", "table").attr("r", 20).attr("cx", (d) => gui.horizontalScaleMap(getTableIndex(d))).attr("cy", (d) => 50).attr("fill", "gray");
    tableCircles.append("title").text((d) => JSON.stringify(d, getCircularReplacer()));
    gui.personLocations.clear();
    console.log(gui.personLocations);
    let waitingIndex = 0;
    for (const p of gui.model.peopleInStore) {
      if (p.currentAction instanceof Entering) {
        if (gui.personLocations.has(p))
          throw new Error(`${p} has already a position!`);
        gui.personLocations.set(
          p,
          {
            x: gui.horizontalScaleMap(0),
            y: sizeFoodServing + distanceBetweenPeople * (waitingIndex + 1)
          }
        );
        waitingIndex += 1;
      }
    }
    for (let group of gui.model.groupsWaitingToBeServed) {
      for (const person of group.members) {
        if (gui.personLocations.has(person))
          throw new Error(`${person} has already a position!`);
        gui.personLocations.set(
          person,
          {
            x: gui.horizontalScaleMap(0),
            y: sizeFoodServing + distanceBetweenPeople * (waitingIndex + 1)
          }
        );
        waitingIndex += 1;
      }
    }
    for (const fs of gui.model.foodStations) {
      let waitingStationIndex = 0;
      for (const person of fs.queue) {
        if (gui.personLocations.has(person))
          throw new Error(`${person} has already a position!`);
        gui.personLocations.set(
          person,
          {
            x: gui.horizontalScaleMap(getTableIndex(fs)),
            y: sizeFoodServing + distanceBetweenPeople * (waitingStationIndex + 1)
          }
        );
        waitingStationIndex += 1;
      }
    }
    for (const table of gui.model.allTables) {
      let waitingStationIndex = 0;
      for (const person of table.sitting) {
        if (gui.personLocations.has(person))
          throw new Error(`${person} has already a position!`);
        gui.personLocations.set(
          person,
          {
            x: gui.horizontalScaleMap(getTableIndex(table)),
            y: sizeFoodServing + distanceBetweenPeople * (waitingStationIndex + 1)
          }
        );
        waitingStationIndex += 1;
      }
    }
    console.log(gui.personLocations);
    console.log(gui.model.peopleInStore);
    const personCircles = gui.containerSVG.selectAll(".person").data(gui.model.peopleInStore, (d) => d.id);
    personCircles.exit().transition().duration(200).style("opacity", 0).attr("transform", `translate(0,999)`);
    let personEnter = personCircles.enter().append("g").attr("class", "person").attr(
      "transform",
      (d) => `translate(${gui.personLocations.get(d)?.x ?? 100},${gui.personLocations.get(d)?.y ?? 100})`
    );
    personEnter.append("circle").attr("r", 10).attr("fill", "black").attr("stroke", "white").attr("stroke-width", 2);
    personEnter.append("text").attr("x", 0).attr("y", 4).attr("text-anchor", "middle").attr("fill", "white").text((d) => d.id);
    personEnter.merge(personCircles).transition().duration(200).attr(
      "transform",
      (d) => `translate(${gui.personLocations.get(d)?.x ?? 100},${gui.personLocations.get(d)?.y ?? 100})`
    );
    personCircles.on("mouseover", function(event, d) {
      gui.infoDiv.transition().duration(50).style("opacity", 0.9);
      gui.infoDiv.html(
        // "<pre>" + JSON.stringify(d, getCircularReplacer(),2) + "</pre>"
        `
    <h3> Person Info </h3>
    <dl>
    <dt>ID</dt>
    <dd>${d.id}</dd>
    <dt>Current Action</dt>
    <dd>${d.currentAction.constructor.name}</dd>
    </dl>`
      ).style("left", `${event.pageX}px`).style("top", `${event.pageY}px`);
    }).on("mouseout", function() {
      gui.infoDiv.transition().duration(100).style("opacity", 0);
    });
    const stepCounter = document.getElementById("time-step-counter");
    stepCounter.innerText = "Minutes passed: " + gui.model.scheduler.current_time.toFixed(2);
  }
  function buildGUI(numberOfTables, numberOfFoodStations, newGuestsArrivalTime) {
    const scheduler = new Scheduler();
    scheduler.reset();
    let tables = [];
    for (let i = 0; i < numberOfTables; i++)
      tables.push({ group: null, sitting: [] });
    let foodStations = [];
    for (let i = 0; i < numberOfFoodStations; i++)
      foodStations.push({ queue: [], servingTime: SERVING_TIME, inUse: false });
    const state = {
      scheduler,
      peopleInStore: [],
      allGroups: [],
      //3 tables?
      allTables: tables,
      peopleWhoLeft: [],
      totalWasteInKg: 0,
      foodStations,
      groupsWaitingToBeServed: [],
      simulationParameters: {
        enteringTime: 0.25,
        foodGrabbedInKg: 0.5,
        eatingTime: 5,
        setupTime: 1.5,
        groupSize: 4,
        tableToFoodStationTime: 0.9,
        arrivalInterval: newGuestsArrivalTime,
        wastePercentage: 0.2
      }
    };
    scheduler.scheduleRepeatingIn(firstStep(state), 1);
    const svg = select_default2("#svgdiv").append("svg").attr("class", ".pure-img").attr("viewBox", "0 0 800 500").attr("id", "simulation_svg");
    const tooltip = select_default2("body").append("div").style("position", "absolute").attr("class", "tooltip").style("opacity", 0);
    const gui = {
      model: state,
      timeDisplayed: 0,
      personLocations: /* @__PURE__ */ new Map(),
      containerSVG: svg,
      horizontalScaleMap: linear2().domain([0, 1 + state.foodStations.length + state.allTables.length]).range([100, 500]),
      tableIndices: /* @__PURE__ */ new Map(),
      infoDiv: tooltip
    };
    console.log("setting the interval....");
    const GUI_TIME_STEP_SIZE = 1;
    auto_default.register(...registerables);
    const canvasElement = document.getElementById("wastechart");
    const config = {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          label: "Cumulative Waste",
          data: [],
          fill: false,
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1
        }]
      },
      options: {
        aspectRatio: 1.3,
        scales: {
          x: {
            type: "linear",
            position: "bottom",
            text: "Simulated time"
          },
          y: {
            type: "linear",
            text: "Total Food wasted",
            ticks: {
              // Include a kg sign in the ticks
              callback: function(value, index2, ticks2) {
                return value + " kg";
              }
            }
          }
        }
      }
    };
    const guiChart = new auto_default(
      canvasElement,
      config
    );
    const button = document.createElement("button");
    button.classList.add("pure-button");
    const playIcon = document.createElement("i");
    playIcon.id = "play-icon";
    playIcon.classList.add("fas", "fa-play", "fa-3x");
    button.id = "pause-resume-button";
    button.appendChild(
      playIcon
    );
    document.getElementById("buttonHolder").appendChild(button);
    button.addEventListener("click", () => {
      isPlaying = !isPlaying;
      if (isPlaying) {
        playIcon.classList.remove("fa-play");
        playIcon.classList.add("fa-pause");
      } else {
        playIcon.classList.remove("fa-pause");
        playIcon.classList.add("fa-play");
      }
    });
    setInterval(() => {
      if (!isPlaying)
        return null;
      const nextActionTime = gui.model.scheduler.getNextTime();
      console.log(nextActionTime);
      gui.model.scheduler.update();
      gui.timeDisplayed += GUI_TIME_STEP_SIZE;
      console.log("update GUI...");
      updateGUI(gui);
      guiChart.data.labels.push(gui.timeDisplayed);
      guiChart.data.datasets[0].data.push(state.totalWasteInKg);
      guiChart.update();
    }, 100);
    console.log("done setting the interval....");
  }

  // src/gui.ts
  function createSlider(props) {
    const { min: min2, max: max2, value, labelText } = props;
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = min2.toString();
    slider.max = max2.toString();
    slider.value = value.toString();
    slider.className = "pure-input-1";
    const label = document.createElement("label");
    label.textContent = labelText;
    const div = document.createElement("div");
    div.classList.add("pure-control-group", "pure-u-3-4");
    div.appendChild(label);
    div.appendChild(slider);
    return div;
  }
  window.addEventListener(
    "load",
    function() {
      const numberOfTablesSlider = createSlider({
        min: 2,
        max: 10,
        value: 5,
        labelText: "Number of Tables: "
      });
      const numberOfFoodStationsSlider = createSlider({
        min: 1,
        max: 3,
        value: 2,
        labelText: "Number of Food Stations: "
      });
      const newGuestsArrivalTimeSlider = createSlider({
        min: 3,
        max: 10,
        value: 5,
        labelText: "New Guests Arrival Time: "
      });
      const submitButton = document.createElement("button");
      submitButton.innerHTML = '<i class="fas fa-people-arrows"></i> Start Simulation!';
      const submitButtonWrapper = document.createElement("div");
      submitButtonWrapper.className = "pure-control-group";
      submitButtonWrapper.appendChild(submitButton);
      submitButton.addEventListener("click", () => {
        const newNumberOfTables = parseInt(numberOfTablesSlider.querySelector("input").value);
        const newNumberOfFoodStations = parseInt(numberOfFoodStationsSlider.querySelector("input").value);
        const newNewGuestsArrivalTime = parseInt(newGuestsArrivalTimeSlider.querySelector("input").value);
        console.log(newNumberOfTables, newNumberOfFoodStations, newNewGuestsArrivalTime);
        document.getElementById("formdiv").remove();
        buildGUI(newNumberOfTables, newNumberOfFoodStations, newNewGuestsArrivalTime);
      });
      const form = document.createElement("form");
      form.classList.add("pure-form", "pure-form-aligned");
      function handleForm(event) {
        event.preventDefault();
      }
      form.addEventListener("submit", handleForm);
      form.appendChild(numberOfTablesSlider);
      form.appendChild(numberOfFoodStationsSlider);
      form.appendChild(newGuestsArrivalTimeSlider);
      form.appendChild(submitButtonWrapper);
      const parentDiv = document.getElementById("firstcontainer");
      const div = document.createElement("div");
      div.id = "formdiv";
      div.classList.add("pure-u-1", "center");
      div.appendChild(form);
      parentDiv.appendChild(div);
    }
  );
})();
/*! Bundled license information:

@kurkle/color/dist/color.esm.js:
  (*!
   * @kurkle/color v0.3.2
   * https://github.com/kurkle/color#readme
   * (c) 2023 Jukka Kurkela
   * Released under the MIT License
   *)

chart.js/dist/chunks/helpers.segment.js:
  (*!
   * Chart.js v4.2.1
   * https://www.chartjs.org
   * (c) 2023 Chart.js Contributors
   * Released under the MIT License
   *)

chart.js/dist/chart.js:
  (*!
   * Chart.js v4.2.1
   * https://www.chartjs.org
   * (c) 2023 Chart.js Contributors
   * Released under the MIT License
   *)
*/
//# sourceMappingURL=index.js.map
