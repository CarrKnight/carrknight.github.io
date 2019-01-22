---
layout: default
title:  "Using MASON and IntelliJ"
date:   2019-01-22 9:40:00
excerpt: <p>A short guide to setup MASON with Intellij</p>
categories: abm mason
--- 

It turns out that all guides to setup MASON with a decent IDE are very old.
The [MASON manual](https://cs.gmu.edu/~eclab/projects/mason/manual.pdf) doesn't bother with this, either.
Therefore here's an updated version using IntelliJ.

Assuming here you have installed IntelliJ and Java JDK.

1. Create a new project, and let it be a "Java" project.
<div>
<img src="{{ site.baseurl }}/assets/intellij/1.png" width="1024px"/>
</div>
Do not select any template
<div>
<img src="{{ site.baseurl }}/assets/intellij/2.png" width="1024px"/>
</div>
give it a name (`mason-test` here)
<div>
<img src="{{ site.baseurl }}/assets/intellij/3.png" width="1024px"/>
</div>
you should have now an empty project
<div>
<img src="{{ site.baseurl }}/assets/intellij/4.png" width="1024px"/>
</div>

2. Create a new directory in `mason_test`
<div>
<img src="{{ site.baseurl }}/assets/intellij/5.png" width="1024px"/>
</div>
call it `lib`
<div>
<img src="{{ site.baseurl }}/assets/intellij/6.png" width="1024px"/>
</div>
put the `mason.jar` file in that directory
<div>
<img src="{{ site.baseurl }}/assets/intellij/7.png" width="1024px"/>
</div>

3. Go file->Project Structure
<div>
<img src="{{ site.baseurl }}/assets/intellij/8.png" width="1024px"/>
</div>
Go to libraries, press the `+` sign and choose `Java`
<div>
<img src="{{ site.baseurl }}/assets/intellij/9.png" width="1024px"/>
</div>
Point it to the `lib` folder you created before (where `mason.jar` is)
<div>
<img src="{{ site.baseurl }}/assets/intellij/10.png" width="1024px"/>
</div>
Confirm that you want that folder to be a library folder for the project/module
<div>
<img src="{{ site.baseurl }}/assets/intellij/11.png" width="1024px"/>
</div>

4. Start coding; create a new java class by right clicking on src-->Java Class
<div>
<img src="{{ site.baseurl }}/assets/intellij/12.png" width="1024px"/>
</div>
Write down your `Students.class`
<div>
<img src="{{ site.baseurl }}/assets/intellij/add.png" width="1024px"/>
</div>
Right click on its tab and press "run"
<div>
<img src="{{ site.baseurl }}/assets/intellij/13.png" width="1024px"/>
</div>
Should see it running at the bottom
<div>
<img src="{{ site.baseurl }}/assets/intellij/14.png" width="1024px"/>
</div>