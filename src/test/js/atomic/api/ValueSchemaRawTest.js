test(
  'ValueSchemaRawTest',

  [
    'ephox.agar.api.Logger',
    'ephox.agar.api.RawAssertions',
    'ephox.boulder.api.FieldPresence',
    'ephox.boulder.api.FieldSchema',
    'ephox.boulder.api.ValueSchema',
    'ephox.katamari.api.Result',
    'ephox.sand.api.JSON'
  ],

  function (Logger, RawAssertions, FieldPresence, FieldSchema, ValueSchema, Result, Json) {
    var checkErr = function (label, expectedPart, input, processor) {
      ValueSchema.asRaw(label, processor, input).fold(function (err) {
        var message = ValueSchema.formatError(err);
        RawAssertions.assertEq(label + '. Was looking to see if contained: ' + expectedPart + '.\nWas: ' + message, true, message.indexOf(expectedPart) > -1);
      }, function (val) {
        assert.fail(label + '\nExpected error: ' + expectedPart + '\nWas success(' + Json.stringify(val, null, 2) + ')');
      });
    };

    var check = function (label, input, processor) {
      var actual = ValueSchema.asRawOrDie(label, processor, input);
      RawAssertions.assertEq(label, input, actual);
    };

    var checkIs = function (label, expected, input, processor) {
      var actual = ValueSchema.asRawOrDie(label, processor, input);
      RawAssertions.assertEq(label, expected, actual);
    };
  
    check('test.1', 10, ValueSchema.anyValue());

    check('test.2', [ 10, 20, 50 ], ValueSchema.arrOfVal());

    check('test.3', {
      a: 'a',
      b: 'b'
    }, ValueSchema.objOf([
      FieldSchema.strict('a'),
      FieldSchema.strict('b')
    ]));

    checkIs('test.3 (with extra)', {
      a: 'a',
      b: 'b'
    }, {
      a: 'a',
      b: 'b',
      c: 'c'
    }, ValueSchema.objOf([
      FieldSchema.strict('a'),
      FieldSchema.strict('b')
    ]));

    checkErr(
      'test.3 (with extra and only) and two fields',
      'unsupported fields: [c]',
      {
        a: 'a',
        b: 'b',
        c: 'c'
      },
      ValueSchema.objOfOnly([
        FieldSchema.strict('a'),
        FieldSchema.strict('b')
      ])
    );

    checkErr(
      'test.3 (with extra and only) and no fields',
      'unsupported fields: [aa]',
      {
        aa: 'aa'
      },
      ValueSchema.objOfOnly([
        
      ])
    );

    check(
      'test.3 with no forbidden field',
      {
        a: 'a',
        b: 'b'
      },
      ValueSchema.objOfOnly([
        FieldSchema.strict('a'),
        FieldSchema.strict('b')
      ])
    );

    checkErr(
      'test.3 with 1 forbidden field',
      'Do not use c. Use b',
      {
        a: 'a',
        b: 'b',
        c: 'c'
      },
      ValueSchema.objOf([
        FieldSchema.strict('a'),
        FieldSchema.strict('b'),
        FieldSchema.forbid('c', 'Do not use c. Use b')
      ])
    );

    check('test.4', {
      urls: [
        { url: 'hi', fresh: 'true' },
        { url: 'hi', fresh: 'true' }
      ]
    }, ValueSchema.objOf([
      FieldSchema.strictArrayOfObj('urls', [
        FieldSchema.strict('url'),
        FieldSchema.defaulted('fresh', '10')
      ])
    ]));

    check('test.5', {
      urls: [ 'dog', 'cat' ]
    }, ValueSchema.objOf([
      FieldSchema.strictArrayOf('urls', ValueSchema.anyValue())
    ]));


    checkErr('test.6 should fail because fields do not both start with f', 
      'start-with-f',
      {
        'fieldA': { val: 'a' },
        'cieldB': { val: 'b' }
      }, ValueSchema.setOf(function (key) {
        return key.indexOf('f') > -1 ? Result.value(key) : Result.error('start-with-f error');
      }, ValueSchema.objOf([
        FieldSchema.strict('val')
      ]))
    );

    checkErr('test.6b should fail because values do not contain "val"', 
      'val',
      {
        'fieldA': { val2: 'a' },
        'fieldB': { val2: 'b' }
      }, ValueSchema.setOf(Result.value, ValueSchema.objOf([
        FieldSchema.strict('val')
      ]))
    );

    check('test.7', 
      {
        'fieldA': { val: 'a' },
        'fieldB': { val: 'b' }
      }, ValueSchema.setOf(Result.value, ValueSchema.objOf([
        FieldSchema.strict('val')
      ]))
    );

    check('test.8', 
      {
        prop: {
          'merged': true,
          other: 'yes'
        }
      }, ValueSchema.objOf([
        FieldSchema.field('prop', 'prop', FieldPresence.mergeWith({ merged: true }), ValueSchema.anyValue())
      ])
    );

    checkIs('test.9 (defaulted thunk) with no value supplied',
      {
        name: 'Dr Jekyll'
      },
      {
        surname: 'Jekyll'
      }, ValueSchema.objOf([
        FieldSchema.field('name', 'name', FieldPresence.defaultedThunk(function (s) {
          return 'Dr ' + s.surname;
        }), ValueSchema.anyValue())
      ])
    );

    checkIs('test.10 (defaulted thunk) with value supplied',
      {
        name: 'Hyde'
      },
      {
        name: 'Hyde'
      }, ValueSchema.objOf([
        FieldSchema.field('name', 'name', FieldPresence.defaultedThunk(function (s) {
          return 'Dr ' + s.surname;
        }), ValueSchema.anyValue())
      ])
    );

    var optionValue = ValueSchema.asRawOrDie('test.option', ValueSchema.objOf([
      FieldSchema.option('alpha')
    ]), {});    
    RawAssertions.assertEq('alpha should be none', true, optionValue.alpha.isNone());

    var optionValue2 = ValueSchema.asRawOrDie('test.option', ValueSchema.objOf([
      FieldSchema.option('alpha')
    ]), { alpha: 'beta' });    
    RawAssertions.assertEq('alpha should be some', true, optionValue2.alpha.isSome());

    var optionValue3 = ValueSchema.asRawOrDie('test.option', ValueSchema.objOf([
      FieldSchema.field('alpha', 'alpha', FieldPresence.asDefaultedOption('fallback'), ValueSchema.anyValue())
    ]), { alpha: 'beta' });
    RawAssertions.assertEq('fallback.opt: alpha:beta should be some(beta)', 'beta', optionValue3.alpha.getOrDie());

    var optionValue4 = ValueSchema.asRawOrDie('test.option', ValueSchema.objOf([
      FieldSchema.field('alpha', 'alpha', FieldPresence.asDefaultedOption('fallback'), ValueSchema.anyValue())
    ]), { alpha: true });
    RawAssertions.assertEq('fallback.opt: alpha:true should be some(fallback)', 'fallback', optionValue4.alpha.getOrDie()());

    var optionValue5 = ValueSchema.asRawOrDie('test.option', ValueSchema.objOf([
      FieldSchema.field('alpha', 'alpha', FieldPresence.asDefaultedOption('fallback'), ValueSchema.anyValue())
    ]), {  });    
    RawAssertions.assertEq('fallback.opt: no alpha should be none', true, optionValue5.alpha.isNone());

    Logger.sync(
      'Checking choose',
      function () {

        var processor = ValueSchema.choose(
          'type',
          {
            'general': [
              FieldSchema.strict('cards')
            ],
            'other': [
              FieldSchema.strict('houses')
            ]
          }
        );

        checkIs(
          'Checking choose(other)',
          { houses: '10' },
          {
            type: 'other',
            houses: '10'
          },
          processor
        );

        checkErr(
          'Checking choose(other) without everything',
          'Could not find valid *strict* value for "houses"',
          {
            type: 'other',
            house: '10'
          },
          processor
        );

        checkErr(
          'Checking choose(other) without wrong schema',
          'Could not find valid *strict* value for "houses"',
          {
            type: 'other',
            cards: '10'
          },
          processor
        );

        checkIs(
          'Checking choose(general)',
          { cards: '10' },
          {
            type: 'general',
            cards: '10'
          },
          processor
        );

        checkErr(
          'Checking choose(general) without everything',
          'Could not find valid *strict* value for "cards"',
          {
            type: 'general',
            mech: '10'
          },
          processor
        );

        checkErr(
          'Checking choose(general) with wrong schema',
          'Could not find valid *strict* value for "cards"',
          {
            type: 'general',
            houses: '10'
          },
          processor
        );

        checkErr(
          'Checking choose(dog)',
          'chosen schema: "dog" did not exist',
          {
            type: 'dog',
            houses: '10'
          },
          processor
        );

      }
    );


  }
);