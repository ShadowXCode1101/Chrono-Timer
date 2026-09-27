# Chrono Timer

yeah so this is basically a timer app.
i made it using next js and stuff. it has some timers and other things because just making a normal timer felt too boring.

## what does it do

* timer
* stopwatch
* alarm
* sessions
* sounds
* themes
* probably some other things i forgot

## how to run

first install everything because obviously.
```bash
npm install
```
then run:
```bash
npm run dev
```
and open `http://localhost:3000`

## sounds

there are supposed to be some sound files here:
```text
public/sounds/
```
with these names:
```text
complete.mp3
alarm.mp3
session-transition.mp3
button.mp3
```
if you don't have them, the app still works.
it just won't make the sounds.
pretty simple.

## fonts

there are some fonts included too:
```text
public/fonts/SquareSansSerif7-Regular.ttf
public/fonts/Clocker-Medium.ttf
```
Clocker is used for the big timer numbers and the other one is basically for the normal UI.
check the font licenses before distributing the app because apparently fonts have rules too.

## saving stuff

some things are saved in localStorage because losing settings every time would be annoying.
these include:
* timer duration
* alarms
* session settings
* theme
* sound settings
things that are currently running are NOT saved.
so if you refresh while a timer is running, congratulations, your timer is gone.
same thing with stopwatch and sessions.
maybe this gets changed later.

## keyboard stuff

the duration inputs have a few keyboard shortcuts.
click or tab into one and the whole number gets selected.
so you can just type the new value.
`Enter` = save it
`Escape` = cancel it
that's basically it.

## project status

it works.
mostly.
if something breaks, i'll probably fix it eventually.

## license

there isn't one here yet.
please don't do anything weird with the project until i decide what license to use.
