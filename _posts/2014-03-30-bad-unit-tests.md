---
layout: default
title:  "Bad Unit Tests"
date:   2014-03-30 16:00:00
categories: java coding
--- 

Unit testing is awesome. Writing your assumptions in code so that they'll always hold no matter what else changes, what's there not to like? But the real question is, are extremely poorly written unit tests also awesome?

Bad code is a pain, bad test code is no exception. I started my zero-knowledge code almost 2 years ago. That was the first time I unit tested. As all things, I learned by doing. Sometimes some old smelly test fails and often it's the test fault. I wrote tests accessing private fields, just to qualify the utter awfulness.

Still I am extremely happy to have those unit tests. Over the past two years I refactored my code in many radical ways (how time passes, how market works, what trading does) and unit-tests were always there pointing out everything I broke.
Without the peace of mind that unit tests afford I wouldn't be able to deal with any code longer than a few thousand lines.

So just write unit-tests already!

Of course, unit testing alone isn't going to find every bug, see [code complete](http://www.amazon.com/gp/product/B004OR1XGK/ref=oh_d__o01_details_o01__i00?ie=UTF8&psc=1).
Still, if you are lucky enough to be into agent-based models and economics you probably can imagine a few test cases and use those for prototyping and acceptance tests. 
And that's also awesome.

